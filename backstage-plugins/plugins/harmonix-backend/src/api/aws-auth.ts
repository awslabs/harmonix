// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';
import { AwsCredentialIdentity } from '@aws-sdk/types';
import { getRootLogger } from '@backstage/backend-common';
import { BackstageUserInfo } from '@backstage/backend-plugin-api';
import { parseEntityRef, UserEntity } from '@backstage/catalog-model';
export interface AwsAuthResponse {
  credentials: AwsCredentialIdentity;
  requester: string;
  owner?: string;
  roleArn: string;
  account: string;
  region: string;
}

function parseEntityref(ref: string, groups: string[]) {
  const entityRef = parseEntityRef(ref);
  if (entityRef.kind === 'group' && entityRef.name !== 'everyone') {
    groups.push(entityRef.name);
  }
  return groups;
}
function getMemberGroupFromUserEntity(user: UserEntity | undefined) {
  if (user?.relations === undefined) {
    // if the user has no relations and isn't a member of any groups, then bail early
    throw new Error('User is not a member of any groups and cannot get mapped AWS credentials');
  }
  const memberGroups = user.relations.reduce((groups, relation) => {
    return parseEntityref(relation.targetRef, groups);
  }, new Array<string>());
  return memberGroups;
}
function getMemberGroupFromUserIdentity(user: BackstageUserInfo | undefined) {
  if (user?.ownershipEntityRefs === undefined) {
    // if the user has no relations and isn't a member of any groups, then bail early
    throw new Error('User is not a member of any groups and cannot get mapped AWS credentials');
  }
  const memberGroups = user.ownershipEntityRefs.reduce((groups, ownershipRefs) => {
    return parseEntityref(ownershipRefs, groups);
  }, new Array<string>());
  return memberGroups;
}
async function fetchCreds(
  memberGroups: string[],
  region: string,
  accountId: string,
  userName: string,
  prefix: string,
  providerName: string
): Promise<AwsAuthResponse> {
  const logger = getRootLogger();
  try {

    // TODO: remove this code once we reference memberGroups
    if (memberGroups) { }

    // Get the SSM Parameter pointing to the DynamoDB security mapping table
    // const ssmClient = new SSMClient({ region });
    // const ssmResponse = await ssmClient.send(
    //   new GetParameterCommand({
    //     Name: '/opa/platform/SecurityMappingTable',
    //     WithDecryption: true,
    //   }),
    // );
    // const securityTableName = ssmResponse.Parameter?.Value;
    // // Loop through the user's groups until there's a match in the security mapping table (first-found)
    // const ddbClient = new DynamoDBClient({ region });
    // let roleArn: string | undefined;
    // for (const group of memberGroups) {
    //   logger.info(group);
    //   // if we've already found a match, move on.
    //   if (roleArn !== undefined) {
    //     break;
    //   }
    //   const tableKey = `${accountId}-${group}`;
    //   logger.debug(`Querying DynamoDB for ${tableKey}`);
    //   const command = new QueryCommand({
    //     TableName: securityTableName,
    //     KeyConditionExpression: 'id = :id',
    //     ExpressionAttributeValues: { ':id': { S: tableKey } },
    //   });
    //   const response = await ddbClient.send(command);
    //   logger.debug(`ddb response: ${JSON.stringify(response, null, 2)}`);
    //   const roleMapped = response.Items?.at(0);
    //   roleArn = roleMapped?.IAMRoleArn.S?.toString();
    // }
    // TODO: Override till auth is designed
    const roleArn = `arn:aws:iam::${accountId}:role/${prefix}-${providerName}-operations-role`;
    // Throw an error if we cycled through all groups and didn't find a matching roleArn
    if (roleArn === undefined) {
      throw new Error(`Did not find a role mapping in the groups for user ${userName}`);
    }
    // Assume the mapped role with the STS service and return the credentials
    logger.debug(`Fetching credentials for mapped role: ${roleArn}`);
    const stsClient = new STSClient({ region });
    const stsResult = await stsClient.send(
      new AssumeRoleCommand({
        RoleArn: roleArn,
        RoleSessionName: `${userName}-backstage-session`,
        DurationSeconds: 3600, // max is 1 hour for chained assumed roles
      }),
    );
    if (stsResult.Credentials) {
      return {
        roleArn: roleArn,
        requester: userName,
        credentials: {
          accessKeyId: stsResult.Credentials.AccessKeyId!,
          secretAccessKey: stsResult.Credentials.SecretAccessKey!,
          sessionToken: stsResult.Credentials.SessionToken,
        },
        account: accountId,
        region: region,
      };
    }
    // if we weren't able to return credentials, throw an error to be caught by callers
    throw new Error(`Assuming role ${roleArn} failed to return credentials`);
  } catch (error) {
    logger.error(error);
    throw error;
  }
}

export async function getAWScreds(
  accountId: string,
  region: string,
  prefix: string,
  providerName: string,
  user?: UserEntity,
  userIdentity?: BackstageUserInfo,
): Promise<AwsAuthResponse> {
  const logger = getRootLogger();
  let memberGroups: string[];
  if (!/\d{12}/.test(accountId)) {
    // must be a string of 12 digits
    throw new Error(`Account id must be 12 digits, but received ${accountId}`);
  }
  if (!/^[a-z]{2}-[a-z]{4,}-\d+$/.test(region)) {
    // must be a string matching a region pattern
    throw new Error(`Region '${region} is not a valid region pattern`);
  }
  // !FIXME: Temporary workaround in place to always use the role running the Backstage app to assume the operations role
  const WORKAROUND = true;
  if (WORKAROUND) {
    return getAWSCredsWorkaround(accountId, region, prefix, providerName, user);
  } else {
    if (user === undefined && userIdentity !== undefined) {
      const userName = parseEntityRef(userIdentity?.userEntityRef).name;
      logger.info(`Fetching credentials for user ${userName}`);
      memberGroups = getMemberGroupFromUserIdentity(userIdentity);
      return fetchCreds(memberGroups, region, accountId, userName, prefix, providerName);
    } else {
      const userName = user?.metadata.name;
      logger.info(`Fetching credentials for user ${userName}`);
      memberGroups = getMemberGroupFromUserEntity(user);
      return fetchCreds(memberGroups, region, accountId, userName!, prefix, providerName);
    }
  }
}

export async function getAWSCredsWorkaround(accountId: string, region: string, prefix: string, providerName: string, user?: UserEntity) {
  const client = new STSClient({ region });
  const userName = user?.metadata.name || "unknown";

  //assemble the arn format to the desire destination environment
  const roleArn = `arn:aws:iam::${accountId}:role/${prefix}-${providerName}-operations-role`;
  console.log(roleArn)

  const stsResult = await client.send(new AssumeRoleCommand({
    RoleArn: roleArn,
    RoleSessionName: `${userName}-backstage-session`,
    DurationSeconds: 3600,
  }));

  return {
    roleArn,
    requester: userName,
    credentials: {
      accessKeyId: stsResult!.Credentials!.AccessKeyId!,
      secretAccessKey: stsResult!.Credentials!.SecretAccessKey!,
      sessionToken: stsResult!.Credentials!.SessionToken,
    },
    account: accountId,
    region: region,
  }
}
