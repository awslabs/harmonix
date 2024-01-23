// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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
  envProviderPrefix: string;
  accountId: string;
  region: string;
  vpcId: string;
  publicSubnets: string;
  privateSubnets: string;
  clusterArn?: string;
  assumedRoleArn: string;
  kubectlLambdaArn?: string;
  kubectlLambdaRoleArn?: string;
}
