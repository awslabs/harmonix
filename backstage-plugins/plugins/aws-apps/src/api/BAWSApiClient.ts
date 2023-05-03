// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ConfigApi, IdentityApi } from '@backstage/core-plugin-api';
import { Service, Task, TaskDefinition } from '@aws-sdk/client-ecs';
import { GetSecretValueCommandOutput } from '@aws-sdk/client-secrets-manager';
import { LogStream } from '@aws-sdk/client-cloudwatch-logs';
import { GetParameterCommandOutput } from '@aws-sdk/client-ssm';
import { AWSServiceResources } from '@aws/plugin-aws-apps-common-for-backstage';
import { ScanCommandOutput } from '@aws-sdk/client-dynamodb';
import { HeadObjectCommandOutput } from '@aws-sdk/client-s3';
import {
  DescribeStackEventsCommandOutput,
  Stack,
  UpdateStackCommandOutput,
  CreateStackCommandOutput,
  DeleteStackCommandOutput
} from "@aws-sdk/client-cloudformation";
import { BAWSApi } from '.';
import { ResponseError } from '@backstage/errors';
import { HTTP } from '../helpers/constants';
import { ContainerDetailsType } from '../types';
export class BawsApiClient implements BAWSApi {
  private readonly configApi: ConfigApi;
  private readonly identityApi: IdentityApi;

  public constructor(options: { configApi: ConfigApi; identityApi: IdentityApi }) {
    this.configApi = options.configApi;
    this.identityApi = options.identityApi;
  }

  async getTaskDetails({
    cluster,
    service,
    account,
    region,
  }: {
    cluster: string;
    service: string;
    account: string;
    region: string;
  }): Promise<Task> {

    const postBody = {
      awsRegion: region,
      awsAccount: account,
      serviceName: service,
      clusterName: cluster
    }

    const task = this.fetch<Task>('/ecs', HTTP.POST, postBody);

    return task;
  }

  async getAuditDetails({
    appName,
    account,
    region,
  }: {
    appName: string;
    account: string;
    region: string;
  }): Promise<ScanCommandOutput> {
    const body = {
      awsRegion: region,
      awsAccount: account,
      appName: appName,
    };
    console.log('Yoooooo');
    console.log(appName, account, region);
    const path = `/dynamo-db/query`;
    const results = this.fetch<ScanCommandOutput>(path, HTTP.POST, body);
    return results;
  }

  async updateService({
    cluster,
    service,
    account,
    region,
    taskDefinition,
    desiredCount,
    restart,
  }: {
    cluster: string;
    service: string;
    account: string;
    region: string;
    taskDefinition: string;
    desiredCount: number | undefined;
    restart: boolean;
  }): Promise<Service> {

    const postBody = {
      clusterName: cluster,
      awsRegion: region,
      awsAccount: account,
      serviceName: service,
      taskDefinition: taskDefinition,
      restart: restart,
      desiredCount: desiredCount
    }

    const serviceDetails = this.fetch<Service>('/ecs/updateService', HTTP.POST, postBody);

    return serviceDetails;
  }

  async getSecret({
    secretName,
    account,
    region,
  }: {
    secretName: string;
    account: string;
    region: string;
  }): Promise<GetSecretValueCommandOutput> {
    console.log(`getSecret: ${secretName}, ${account}, ${region}`);

    const postBody = {
      awsRegion: region,
      awsAccount: account,
      secretArn: secretName
    }

    const secretDetails = this.fetch<GetSecretValueCommandOutput>('/secrets', HTTP.POST, postBody);

    return secretDetails;
  }

  async getLogStreamNames({
    logGroupName,
    account,
    region,
  }: {
    logGroupName: string;
    account: string;
    region: string;
  }): Promise<LogStream[]> {
    console.log(logGroupName, account, region);
    const path = '/logs/stream';

    const logStreams = this.fetch<LogStream[]>(path, HTTP.POST, {
      logGroupName,
      awsAccount: account,
      awsRegion: region,
    });

    return logStreams;
  }

  async getLogStreamData({
    logGroupName,
    logStreamName,
    account,
    region,
  }: {
    logGroupName: string;
    logStreamName: string;
    account: string;
    region: string;
  }): Promise<string> {
    console.log(logGroupName, logStreamName, account, region);
    const path = '/logs/stream-events';

    const logStreamData = this.fetch<string>(path, HTTP.POST, {
      logGroupName,
      logStreamName,
      awsAccount: account,
      awsRegion: region,
    });

    return logStreamData;
  }

  async getStackDetails({
    stackName,
    account,
    region,
  }: {
    stackName: string;
    account: string;
    region: string;
  }): Promise<Stack> {
    const path = '/cloudformation/describeStack';

    const stack = this.fetch<Stack>(path, HTTP.POST, {
      stackName,
      awsAccount: account,
      awsRegion: region,
    });

    return stack;
  }

  async getStackEvents(
    { stackName, account, region, }: { stackName: string; account: string; region: string; })
    : Promise<DescribeStackEventsCommandOutput> {
    const path = '/cloudformation/describeStackEvents';

    const stack = this.fetch<DescribeStackEventsCommandOutput>(path, HTTP.POST, {
      stackName,
      awsAccount: account,
      awsRegion: region,
    });

    return stack;
  }

  async updateStack({
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
  }): Promise<UpdateStackCommandOutput> {
    const path = '/cloudformation/updateStack';

    const stack = this.fetch<UpdateStackCommandOutput>(path, HTTP.POST, {
      componentName,
      stackName,
      s3BucketName,
      cfFileName,
      awsAccount: account,
      awsRegion: region,
    });

    return stack;
  }

  async createStack({
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
  }): Promise<CreateStackCommandOutput> {
    const path = '/cloudformation/createStack';

    const stack = this.fetch<CreateStackCommandOutput>(path, HTTP.POST, {
      componentName,
      stackName,
      s3BucketName,
      cfFileName,
      awsAccount: account,
      awsRegion: region,
    });

    return stack;
  }

  async deleteStack({
    componentName,
    stackName,
    account,
    region,
  }: {
    componentName: string;
    stackName: string;
    account: string;
    region: string;
  }): Promise<DeleteStackCommandOutput> {
    const path = '/cloudformation/deleteStack';

    const stack = this.fetch<DeleteStackCommandOutput>(path, HTTP.POST, {
      componentName,
      stackName,
      awsAccount: account,
      awsRegion: region,
    });

    return stack;
  }

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
  }): Promise<HeadObjectCommandOutput> {
    const path = '/s3/doesFileExist';

    const fileExistsOutput = this.fetch<HeadObjectCommandOutput>(path, HTTP.POST, {
      bucketName,
      fileName,
      awsAccount: account,
      awsRegion: region,
    });

    return fileExistsOutput;
  }

  async getResourceGroupResources({
    rscGroupArn,
    account,
    region,
  }: {
    rscGroupArn: string;
    account: string;
    region: string;
  }): Promise<AWSServiceResources> {
    console.log(`getResourceGroupResources: ${rscGroupArn}, ${account}, ${region}`);

    const postBody = {
      awsRegion: region,
      awsAccount: account,
      resourceGroupName: rscGroupArn,
    };

    const rscGroupDetails = this.fetch<AWSServiceResources>('/resource-group', HTTP.POST, postBody);
    return rscGroupDetails;
  }
  // TODO: Move to backend
  async getSSMParameter({
    ssmParamName,
    account,
    region,
  }: {
    ssmParamName: string;
    account: string;
    region: string;
  }): Promise<GetParameterCommandOutput> {
    console.log(`getSSMParameter: ${ssmParamName}, ${account}, ${region}`);

    const postBody = {
      awsRegion: region,
      awsAccount: account,
      ssmParamName,
    };

    const ssmParamDetails = this.fetch<GetParameterCommandOutput>('/ssm-parameter', HTTP.POST, postBody);
    return ssmParamDetails;
  }
  async describeTaskDefinition({
    taskDefinitionArn,
    account,
    region,
  }: {
    taskDefinitionArn: string;
    account: string;
    region: string;
  }): Promise<TaskDefinition> {

    const postBody = {
      awsRegion: region,
      awsAccount: account,
      taskDefinition: taskDefinitionArn
    }
    const taskD = this.fetch<TaskDefinition>('/ecs/describeTaskDefinition', HTTP.POST, postBody);

    return taskD;
  }

  async updateTaskDefinition({
    taskDefinitionArn,
    account,
    region,
    envVar,
  }: {
    taskDefinitionArn: string;
    account: string;
    region: string;
    envVar: ContainerDetailsType[];
  }): Promise<TaskDefinition> {

    const postBody = {
      awsRegion: region,
      awsAccount: account,
      taskDefinition: taskDefinitionArn,
      envVar: envVar
    }

    const taskD = this.fetch<TaskDefinition>('/ecs/updateTaskDefinition', HTTP.POST, postBody);
    return taskD;
  }

  private async fetch<T>(path: string, method = HTTP.GET, data?: any): Promise<T> {
    const baseUrl = `${await this.configApi.getString('backend.baseUrl')}/api/aws-apps-backend`;
    const url = baseUrl + path;

    const { token: idToken } = await this.identityApi.getCredentials();

    let headers: { [k: string]: string } = {};
    if (idToken) {
      headers.Authorization = `Bearer ${idToken}`;
    }

    let requestOptions: RequestInit = {
      method,
      headers,
    };

    if (data) {
      requestOptions.body = JSON.stringify(data);
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      throw await ResponseError.fromResponse(response);
    }

    let responseType = response.headers.get('Content-Type');

    if (responseType && responseType.indexOf('application/json') >= 0) {
      return response.json() as Promise<T>;
    } else {
      return response.text() as unknown as Promise<T>;
    }
  }
}
