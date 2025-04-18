// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export type AppPromoParams = {
  envName: string;
  envRequiresManualApproval: boolean;
  appName: string;
  providers: AWSProviderParams[];
};

export type AWSProviderParams = {
  awsAccount: string;
  awsRegion: string;
  assumedRoleArn: string;
  environmentName: string;
  envRequiresManualApproval: boolean;
  prefix: string;
  providerName: string;
  parameters: { [key: string]: string }  //Parameters key value map for provisioning the app on the designated provider
}
