// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { AwsCredentialIdentity } from '@aws-sdk/types';
import { Logger } from 'winston';
import { UserEntity } from '@backstage/catalog-model';
import { getAWScreds } from '@aws/plugin-aws-apps-backend-for-backstage';
import { EnvironmentProvider, EnvironmentProviderConnection } from '../types';
import {
  CreateSecretCommand,
  CreateSecretCommandInput,
  PutSecretValueCommand,
  PutSecretValueCommandInput,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';

import { DefaultAwsCredentialsManager } from '@backstage/integration-aws-node';
import { LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';

export type EnvProviderConnectMap = {
  [key: string]: EnvironmentProviderConnection;
};

/**
 * Returns connection information (credentials, accountId, region) for each supplied
 * environment provider.
 *
 * @param envProviders - List of environment providers
 * @param userEntity - the user entity
 * @returns A map of connection information, keyed off of the environment provider name
 */
export async function getEnvironmentProviderConnectInfo(
  config: Config,
  logger: LoggerService,
  envProviders: EnvironmentProvider[],
  userEntity?: UserEntity,
): Promise<EnvProviderConnectMap> {
  return (
    await Promise.all(
      envProviders.map(async (envProvider: EnvironmentProvider): Promise<EnvironmentProviderConnection> => {
        const { accountId, region, envProviderPrefix, envProviderName } = envProvider;
        const awsAuthResponse = await getAWScreds(
          config,
          logger,
          accountId,
          region,
          envProviderPrefix,
          envProviderName,
          userEntity,
        );
        return {
          providerName: envProvider.envProviderName,
          accountId,
          region,
          awsAuthResponse,
        };
      }),
    )
  ).reduce((acc, envProviderConnection) => {
    const typedAcc: EnvProviderConnectMap = acc;
    return {
      ...typedAcc,
      [envProviderConnection.providerName]: envProviderConnection,
    };
  }, {});
}

// Get the value for a specified SSM Parameter Store path
export async function getSSMParameterValue(
  region: string,
  creds: AwsCredentialIdentity,
  ssmPath: string,
  logger?: Logger,
): Promise<string> {
  const ssmClient = new SSMClient({
    region,
    customUserAgent: 'opa-plugin',
    credentials: creds,
  });

  let ssmResponse;
  try {
    ssmResponse = await ssmClient.send(
      new GetParameterCommand({
        Name: ssmPath,
      }),
    );
  } catch (error) {
    throw new Error(`SSM Parameter ${ssmPath} was not found or has no value`);
  }

  if (ssmResponse.Parameter?.Value === undefined) {
    throw new Error(`SSM Parameter ${ssmPath} was not found or has no value`);
  }
  if (logger) {
    logger.debug(`SSM Response: ${JSON.stringify(ssmResponse)}`);
  }
  return ssmResponse.Parameter.Value;
}

// Get the value for a specified SSM Parameter Store path
export async function getPlatformAccountSSMParameterValue(
  config: Config,
  ssmPath: string,
  region?: string,
  logger?: Logger,
): Promise<string> {
  const awsCredentialsManager = DefaultAwsCredentialsManager.fromConfig(config);
  const awsCredentialProvider = await awsCredentialsManager.getCredentialProvider({});
  const ssmClient = new SSMClient({
    region,
    customUserAgent: 'opa-plugin',
    credentialDefaultProvider: () => awsCredentialProvider.sdkCredentialProvider,
  });
  const ssmResponse = await ssmClient.send(
    new GetParameterCommand({
      Name: ssmPath,
    }),
  );

  // The parameter must exist, else we don't have a StepFunction state machine to invoke
  if (ssmResponse.Parameter?.Value === undefined) {
    throw new Error(`SSM Parameter ${ssmPath} was not found or has no value`);
  }
  if (logger) {
    logger.debug(`SSM Response: ${JSON.stringify(ssmResponse)}`);
  }
  return ssmResponse.Parameter.Value;
}

export async function createSecret(
  secretName: string,
  description: string,
  region?: string,
  tags?: { Key: string; Value: string | number | boolean }[],
  logger?: Logger,
): Promise<string | undefined> {
  if (logger) {
    logger.debug('Calling create Secret');
  }

  // convert tags to SecretsManager.Tag format
  const resourceTags = tags?.map(tag => {
    return { Key: tag.Key, Value: tag.Value.toString() };
  });

  const client = new SecretsManagerClient({
    region,
  });
  const params: CreateSecretCommandInput = {
    Name: secretName,
    Description: description,
    Tags: resourceTags,
  };

  const command = new CreateSecretCommand(params);
  try {
    const secretResponse = await client.send(command);
    return secretResponse.ARN;
  } catch (error: any) {
    throw Error(`Error creating Secret - ${error.toString()}`);
  }
}

export async function putSecret(
  secretArn: string,
  secretValue: string,
  region?: string,
  logger?: Logger,
): Promise<void> {
  if (logger) {
    logger.debug(`Updating secret ${secretArn}`);
  }

  const client = new SecretsManagerClient({
    region,
  });
  const params: PutSecretValueCommandInput = {
    SecretId: secretArn,
    SecretString: secretValue,
  };

  const command = new PutSecretValueCommand(params);
  try {
    await client.send(command);
  } catch (error: any) {
    if (logger) {
      logger.error(error);
      logger.error('Error updating secret value');
    }
  }
  return Promise.reject(new Error('Error updating secret value'));
}
