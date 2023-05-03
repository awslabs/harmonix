// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { AwsCredentialIdentity } from '@aws-sdk/types';
import { Logger } from 'winston';
import { UserEntity } from '@backstage/catalog-model';
import { getAWScreds } from '@aws/plugin-aws-apps-backend-for-backstage';
import { EnvironmentProvider, EnvironmentProviderConnection } from '../types';

export type EnvProviderConnectMap = { [key: string]: EnvironmentProviderConnection; }

/**
 * Returns connection information (credentials, accountId, region) for each supplied 
 * environment provider.
 *
 * @param envProviders - List of environment providers
 * @param userEntity - the user entity
 * @returns A map of connection information, keyed off of the environment provider name
 */
export async function getEnvironmentProviderConnectInfo(
  envProviders: EnvironmentProvider[], userEntity?: UserEntity)
  : Promise<EnvProviderConnectMap> {

  const envProviderConnectionsMap = (await Promise.all(
    envProviders.map(async (envProvider: EnvironmentProvider): Promise<EnvironmentProviderConnection> => {
      const { accountId, region } = envProvider;
      const awsAuthResponse = await getAWScreds(accountId, region, userEntity);
      return {
        providerName: envProvider.envProviderName,
        accountId,
        region,
        awsAuthResponse,
      }
    })
  )).reduce((acc, envProviderConnection) => {
    const typedAcc: EnvProviderConnectMap = acc;
    return {
      ...typedAcc, [envProviderConnection.providerName]: envProviderConnection
    };
  }, {});

  return envProviderConnectionsMap;
}

// Get the value for a specified SSM Parameter Store path
export async function getSSMParameterValue(region: string, creds: AwsCredentialIdentity, ssmPath: string, logger?: Logger): Promise<string> {
  const ssmClient = new SSMClient({
    region,
    customUserAgent: 'baws-plugin',
    credentials: creds,
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
