// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  CreateStackCommandOutput,
  DeleteStackCommandOutput,
  DescribeStackEventsCommandOutput,
  Stack,
  UpdateStackCommandOutput
} from "@aws-sdk/client-cloudformation";
import { LogStream } from '@aws-sdk/client-cloudwatch-logs';
import { ScanCommandOutput } from '@aws-sdk/client-dynamodb';
import { Service, Task, TaskDefinition } from '@aws-sdk/client-ecs';
import { HeadObjectCommandOutput } from '@aws-sdk/client-s3';
import { DeleteSecretCommandOutput, GetSecretValueCommandOutput } from '@aws-sdk/client-secrets-manager';
import { GetParameterCommandOutput } from '@aws-sdk/client-ssm';
import { AWSProviderParams, AWSServiceResources, BackendParams, BindResourceParams, AWSEnvironmentProviderRecord } from '@aws/plugin-aws-apps-common-for-backstage';
import { createApiRef } from '@backstage/core-plugin-api';
import { ContainerDetailsType } from '../types';
import { InvokeCommandOutput } from "@aws-sdk/client-lambda";
import { IRepositoryInfo } from "@aws/plugin-aws-apps-common-for-backstage";

export const opaApiRef = createApiRef<OPAApi>({
  id: 'plugin.opa.app',
});

export interface OPAApi {

  setPlatformParams(appName: string, region: string): void;
  setBackendParams(backendParams: BackendParams): void;

  getAuditDetails(backendParamsOverrides?: BackendParams): Promise<ScanCommandOutput>;

  getTaskDetails({
    service,
    cluster,
    backendParamsOverrides,
  }: {
    service: string;
    cluster: string;
    backendParamsOverrides?: BackendParams
  }): Promise<Task>;

  updateService({
    cluster,
    service,
    taskDefinition,
    restart,
    desiredCount,
    backendParamsOverrides,
  }: {
    cluster: string;
    service: string;
    taskDefinition: string;
    desiredCount: number | undefined;
    restart: boolean;
    backendParamsOverrides?: BackendParams;
  }): Promise<Service>;

  getSecret({
    secretName,
    backendParamsOverrides,
  }: {
    secretName: string;
    backendParamsOverrides?: BackendParams;
  }): Promise<GetSecretValueCommandOutput>;

  getPlatformSecret({
    secretName,
  }: {
    secretName: string;
  }): Promise<GetSecretValueCommandOutput>;

  getPlatformSSMParam({
    paramName,
  }: {
    paramName: string;
  }): Promise<GetParameterCommandOutput>;

  bindResource({
    repoInfo,
    params,
    gitAdminSecret,
    backendParamsOverrides,
  }: {
    repoInfo: IRepositoryInfo;
    params: BindResourceParams;
    gitAdminSecret: string;
    backendParamsOverrides?: BackendParams;
  }): Promise<any>;

  unBindResource({
    repoInfo,
    params,
    gitAdminSecret,
    backendParamsOverrides,
  }: {
    repoInfo: IRepositoryInfo;
    params: BindResourceParams;
    gitAdminSecret: string;
    backendParamsOverrides?: BackendParams;
  }): Promise<any>;

  updateProviderToEnvironment({
    repoInfo,
    provider,
    gitAdminSecret,
    envName,
    action,
    backendParamsOverrides,
  }: {
    repoInfo: IRepositoryInfo;
    provider: AWSEnvironmentProviderRecord;
    gitAdminSecret: string;
    envName: string;
    action: string;
    backendParamsOverrides: BackendParams;
  }): Promise<any>;

  deleteTFProvider({
    backendParamsOverrides,
    repoInfo,
    gitAdminSecret,
    envName,
  }: {
    backendParamsOverrides: BackendParams;
    repoInfo: IRepositoryInfo;
    gitAdminSecret: string;
    envName: string;
  }): Promise<any>;

  deletePlatformSecret({
    secretName
  }: {
    secretName: string;
  }): Promise<DeleteSecretCommandOutput>;

  deleteRepository({
    repoInfo,
    gitAdminSecret,
    backendParamsOverrides,
  }: {
    repoInfo: IRepositoryInfo;
    gitAdminSecret: string;
    backendParamsOverrides?: BackendParams;
  }): Promise<any>;

  getResourceGroupResources({
    rscGroupArn,
    backendParamsOverrides,
  }: {
    rscGroupArn: string;
    backendParamsOverrides?: BackendParams;
  }): Promise<AWSServiceResources>;

  getSSMParameter({
    ssmParamName,
    backendParamsOverrides,
  }: {
    ssmParamName: string;
    backendParamsOverrides?: BackendParams;
  }): Promise<GetParameterCommandOutput>;

  getLogStreamNames({
    logGroupName,
    backendParamsOverrides,
  }: {
    logGroupName: string;
    backendParamsOverrides?: BackendParams;
  }): Promise<LogStream[]>;

  getLogStreamData({
    logGroupName,
    logStreamName,
    backendParamsOverrides,
  }: {
    logGroupName: string;
    logStreamName: string;
    backendParamsOverrides?: BackendParams;
  }): Promise<string>;

  getStackDetails({
    stackName,
    backendParamsOverrides,
  }: {
    stackName: string;
    backendParamsOverrides?: BackendParams;
  }): Promise<Stack>;

  getStackEvents({
    stackName,
    backendParamsOverrides,
  }: {
    stackName: string;
    backendParamsOverrides?: BackendParams;
  }): Promise<DescribeStackEventsCommandOutput>;

  updateStack({
    componentName,
    stackName,
    s3BucketName,
    cfFileName,
    environmentName,
    repoInfo,
    gitAdminSecret,
    backendParamsOverrides,
  }: {
    componentName: string;
    stackName: string;
    s3BucketName: string;
    cfFileName: string;
    environmentName?: string;
    repoInfo: IRepositoryInfo;
    gitAdminSecret?: string;
    backendParamsOverrides?: BackendParams;
  }): Promise<UpdateStackCommandOutput>;

  createStack({
    componentName,
    stackName,
    s3BucketName,
    cfFileName,
    environmentName,
    repoInfo,
    gitAdminSecret,
    backendParamsOverrides,
  }: {
    componentName: string;
    stackName: string;
    s3BucketName: string;
    cfFileName: string;
    environmentName?: string;
    repoInfo: IRepositoryInfo;
    gitAdminSecret?: string;
    backendParamsOverrides?: BackendParams;
  }): Promise<CreateStackCommandOutput>;

  deleteStack({
    componentName,
    stackName,
    backendParamsOverrides,
  }: {
    componentName: string;
    stackName: string;
    backendParamsOverrides?: BackendParams;
  }): Promise<DeleteStackCommandOutput>;

  doesS3FileExist({
    bucketName,
    fileName,
    backendParamsOverrides,
  }: {
    bucketName: string;
    fileName: string;
    backendParamsOverrides?: BackendParams;
  }): Promise<HeadObjectCommandOutput>;

  updateTaskDefinition({
    taskDefinitionArn,
    envVar,
    backendParamsOverrides,
  }: {
    taskDefinitionArn: string;
    envVar: ContainerDetailsType[];
    backendParamsOverrides?: BackendParams;
  }): Promise<TaskDefinition>;

  describeTaskDefinition({
    taskDefinitionArn,
    backendParamsOverrides,
  }: {
    taskDefinitionArn: string;
    backendParamsOverrides?: BackendParams;
  }): Promise<TaskDefinition>;

  promoteApp({
    envName,
    envRequiresManualApproval,
    repoInfo,
    gitAdminSecret,
    providersData,
  }: {
    envName: string;
    envRequiresManualApproval: boolean;
    repoInfo: IRepositoryInfo;
    gitAdminSecret: string;
    providersData: AWSProviderParams[];
  }): Promise<any>;

  invokeLambda({
    functionName,
    actionDescription,
    body,
    backendParamsOverrides
  }: {
    functionName: string;
    actionDescription: string;
    body: string;
    backendParamsOverrides?: BackendParams;
  }): Promise<InvokeCommandOutput>;

  getEKSAppManifests({
    envName,
    gitAdminSecret,
    repoInfo,
    backendParamsOverrides
  }: {
    envName: string;
    gitAdminSecret: string;
    repoInfo: IRepositoryInfo;
    backendParamsOverrides?: BackendParams;
  }): Promise<any>

  updateEKSApp({
    actionDescription,
    envName,
    cluster,
    updateKey,
    updateValue,
    kubectlLambda,
    lambdaRoleArn,
    gitAdminSecret,
    repoInfo,
    backendParamsOverrides
  }: {
    actionDescription: string;
    envName: string;
    cluster: string;
    updateKey: string;
    updateValue: string | number;
    kubectlLambda: string;
    lambdaRoleArn: string;
    gitAdminSecret: string;
    repoInfo: IRepositoryInfo;
    backendParamsOverrides?: BackendParams;
  }): Promise<any>;
}
