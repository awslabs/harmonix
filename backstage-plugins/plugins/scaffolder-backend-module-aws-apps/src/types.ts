import { JsonArray, } from '@backstage/types';
import { AwsAuthResponse } from '@aws/plugin-aws-apps-backend-for-backstage';

export type EnvironmentProviderConnection = {
  providerName: string;
  accountId: string;
  region: string;
  awsAuthResponse: AwsAuthResponse;
}

export type EnvironmentProvider = {
  envProviderName: string;
  envProviderType: string;
  accountId: string;
  region: string;
  vpcId: string;
  publicSubnets: JsonArray;
  privateSubnets: JsonArray;
  ecsClusterArn?: string;
  assumedRoleArn: string;
}
