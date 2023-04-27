// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { createApiRef } from '@backstage/core-plugin-api';
import { Task, Service, TaskDefinition } from '@aws-sdk/client-ecs';
import { GetSecretValueCommandOutput } from '@aws-sdk/client-secrets-manager';
import { GetParameterCommandOutput } from '@aws-sdk/client-ssm';
import { AWSServiceResources } from '@internal/plugin-aws-apps-common';
import { LogStream } from '@aws-sdk/client-cloudwatch-logs';
import { ScanCommandOutput } from '@aws-sdk/client-dynamodb';
import { HeadObjectCommandOutput } from '@aws-sdk/client-s3';
import {
  Stack,
  DeleteStackCommandOutput,
  CreateStackCommandOutput,
  UpdateStackCommandOutput,
  DescribeStackEventsCommandOutput
} from "@aws-sdk/client-cloudformation";
import { ContainerDetailsType } from '../types';

export const bawsApiRef = createApiRef<BAWSApi>({
  id: 'plugin.baws.app',
});

export interface AuditRecord {
  id: string;
  origin: string;
  actionType: string;
  name: string;
  createdDate: string;
  createdAt: string;
  initiatedBy: string;
  owner: string;
  assumedRole: string;
  targetAccount: string;
  targetRegion: string;
  request: string;
  status: string;
  message: string;
}

export interface BAWSApi {
  getAuditDetails({
    appName,
    account,
    region,
  }: {
    appName: string;
    account: string;
    region: string;
  }): Promise<ScanCommandOutput>;

  getTaskDetails({
    service,
    cluster,
    account,
    region,
  }: {
    service: string;
    cluster: string;
    account: string;
    region: string;
  }): Promise<Task>;

  updateService({
    cluster,
    service,
    account,
    region,
    taskDefinition,
    restart,
    desiredCount,
  }: {
    cluster: string;
    service: string;
    account: string;
    taskDefinition: string;
    region: string;
    desiredCount: number | undefined;
    restart: boolean;
  }): Promise<Service>;

  getSecret({
    secretName,
    account,
    region,
  }: {
    secretName: string;
    account: string;
    region: string;
  }): Promise<GetSecretValueCommandOutput>;

  getResourceGroupResources({
    rscGroupArn,
    account,
    region,
  }: {
    rscGroupArn: string;
    account: string;
    region: string;
  }): Promise<AWSServiceResources>;

  getSSMParameter({
    ssmParamName,
    account,
    region,
  }: {
    ssmParamName: string;
    account: string;
    region: string;
  }): Promise<GetParameterCommandOutput>;

  getLogStreamNames({
    logGroupName,
    account,
    region,
  }: {
    logGroupName: string;
    account: string;
    region: string;
  }): Promise<LogStream[]>;

  getLogStreamData({
    logGroupName,
    account,
    region,
  }: {
    logGroupName: string;
    logStreamName: string;
    account: string;
    region: string;
  }): Promise<string>;

  getStackDetails({
    stackName,
    account,
    region,
  }: {
    stackName: string;
    account: string;
    region: string;
  }): Promise<Stack>;

  getStackEvents({
    stackName,
    account,
    region,
  }: {
    stackName: string;
    account: string;
    region: string;
  }): Promise<DescribeStackEventsCommandOutput>;

  updateStack({
    componentName,
    stackName,
    s3BucketName,
    cfFileName,
    account,
    region,
  }: {
    componentName: string;
    stackName: string;
    s3BucketName: string;
    cfFileName: string;
    account: string;
    region: string;
  }): Promise<UpdateStackCommandOutput>;

  createStack({
    componentName,
    stackName,
    s3BucketName,
    cfFileName,
    account,
    region,
  }: {
    componentName: string;
    stackName: string;
    s3BucketName: string;
    cfFileName: string;
    account: string;
    region: string;
  }): Promise<CreateStackCommandOutput>;

  deleteStack({
    componentName,
    stackName,
    account,
    region,
  }: {
    componentName: string;
    stackName: string;
    account: string;
    region: string;
  }): Promise<DeleteStackCommandOutput>;

  doesS3FileExist({
    bucketName,
    fileName,
    account,
    region,
  }: {
    bucketName: string;
    fileName: string;
    account: string;
    region: string;
  }): Promise<HeadObjectCommandOutput>;

  updateTaskDefinition({
    taskDefinitionArn,
    account,
    region,
    envVar,
  }: {
    taskDefinitionArn: string;
    account: string;
    region: string;
    envVar: ContainerDetailsType[];
  }): Promise<TaskDefinition>;

  describeTaskDefinition({
    taskDefinitionArn,
    account,
    region,
  }: {
    taskDefinitionArn: string;
    account: string;
    region: string;
  }): Promise<TaskDefinition>;
}
