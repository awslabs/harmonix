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
import { AWSEnvironmentProviderRecord, AWSProviderParams, AWSServiceResources, BackendParams, BindResourceParams } from '@aws/plugin-aws-apps-common-for-backstage';
import { ConfigApi, FetchApi } from '@backstage/core-plugin-api';
import { ResponseError } from '@backstage/errors';
import { OPAApi } from '.';
import { HTTP } from '../helpers/constants';
import { ContainerDetailsType } from '../types';
import { InvokeCommandOutput } from "@aws-sdk/client-lambda";
import { PlatformSCMParams } from "@aws/plugin-aws-apps-common-for-backstage/src/types/PlatformTypes";


export class OPAApiClient implements OPAApi {
  private readonly configApi: ConfigApi;
  private readonly fetchApi: FetchApi;
  private backendParams: BackendParams;
  private platformAppName: string;
  private platformRegion: string;

  public constructor(options: { configApi: ConfigApi; fetchApi: FetchApi; }) {
    this.configApi = options.configApi;
    this.fetchApi = options.fetchApi;
    this.backendParams = { appName: '', awsAccount: '', awsRegion: '', prefix: '', providerName: '' };
    this.platformAppName = '';
    this.platformRegion = '';
  }

  public setPlatformParams(appName: string, region: string) {
    this.platformAppName = appName;
    this.platformRegion = region;
  }

  public setBackendParams(backendParams: BackendParams) {
    this.backendParams = backendParams;
  }

  private getAppliedBackendParams(backendParamsOverrides?: BackendParams): BackendParams {
    if (backendParamsOverrides) {
      return backendParamsOverrides!;
    } else {
      return this.backendParams;
    }
  }

  async getTaskDetails({
    cluster,
    service,
    backendParamsOverrides,
  }: {
    cluster: string;
    service: string;
    backendParamsOverrides?: BackendParams
  }): Promise<Task> {

    const beParams = this.getAppliedBackendParams(backendParamsOverrides);

    const postBody = {
      ...beParams,
      serviceName: service,
      clusterName: cluster,
    }

    const task = this.fetch<Task>('/ecs', HTTP.POST, postBody);

    return task;
  }

  async getAuditDetails(backendParamsOverrides?: BackendParams): Promise<ScanCommandOutput> {
    const body = this.getAppliedBackendParams(backendParamsOverrides);

    const path = `/audit-entries`;
    const results = this.fetch<ScanCommandOutput>(path, HTTP.POST, body);
    return results;
  }

  async updateService({
    cluster,
    service,
    taskDefinition,
    desiredCount,
    restart,
    backendParamsOverrides,
  }: {
    cluster: string;
    service: string;
    taskDefinition: string;
    desiredCount: number | undefined;
    restart: boolean;
    backendParamsOverrides?: BackendParams
  }): Promise<Service> {

    const beParams = this.getAppliedBackendParams(backendParamsOverrides);

    const postBody = {
      ...beParams,
      clusterName: cluster,
      serviceName: service,
      taskDefinition: taskDefinition,
      restart: restart,
      desiredCount: desiredCount,
    }

    const serviceDetails = this.fetch<Service>('/ecs/updateService', HTTP.POST, postBody);

    return serviceDetails;
  }

  async getSecret({
    secretName,
    backendParamsOverrides,
  }: {
    secretName: string;
    backendParamsOverrides?: BackendParams;
  }): Promise<GetSecretValueCommandOutput> {
    const beParams = this.getAppliedBackendParams(backendParamsOverrides);

    const postBody = {
      ...beParams,
      secretArn: secretName,
    }
    const secretDetails = this.fetch<GetSecretValueCommandOutput>('/secrets', HTTP.POST, postBody);

    return secretDetails;
  }

  async getLogStreamNames({
    logGroupName,
    backendParamsOverrides,
  }: {
    logGroupName: string;
    backendParamsOverrides?: BackendParams;
  }): Promise<LogStream[]> {
    const beParams = this.getAppliedBackendParams(backendParamsOverrides);
    const path = '/logs/stream';

    const logStreams = this.fetch<LogStream[]>(path, HTTP.POST, {
      ...beParams,
      logGroupName,
    });

    return logStreams;
  }

  async getLogStreamData({
    logGroupName,
    logStreamName,
    backendParamsOverrides,
  }: {
    logGroupName: string;
    logStreamName: string;
    backendParamsOverrides?: BackendParams
  }): Promise<string> {
    const beParams = this.getAppliedBackendParams(backendParamsOverrides);
    const path = '/logs/stream-events';

    const logStreamData = this.fetch<string>(path, HTTP.POST, {
      ...beParams,
      logGroupName,
      logStreamName,
    });

    return logStreamData;
  }

  //TODO: Move platform calls to separate backend endpoints - interface does not require provider information
  async getPlatformSecret({
    secretName,
  }: {
    secretName: string;
  }): Promise<GetSecretValueCommandOutput> {

    const postBody = {
      ...this.backendParams,
      secretArn: secretName
    }

    const secretDetails = this.fetch<GetSecretValueCommandOutput>('/platform/secrets', HTTP.POST, postBody);

    return secretDetails;
  }

  async getPlatformSSMParam({
    paramName,
  }: {
    paramName: string;
  }): Promise<GetParameterCommandOutput> {


    const postBody = {
      ...this.backendParams,
      paramName
    }

    const paramDetails = this.fetch<GetParameterCommandOutput>('/platform/ssm', HTTP.POST, postBody);

    return paramDetails;
  }

  async bindResource({
    params,
    gitAdminSecret,
  }: {
    params: BindResourceParams;
    gitAdminSecret: string;
    backendParamsOverrides?: BackendParams
  }): Promise<any> {


    const postBody = {
      ...this.backendParams,
      providerName: params.providerName,
      gitHost: params.gitHost,
      gitProjectGroup: params.gitProjectGroup,
      gitRepoName: params.gitRepoName,
      gitAdminSecret,
      envName: params.envName,
      policies: params.policies,
      resourceName: params.resourceName,
      resourceEntityRef: params.resourceEntityRef
    }

    const bindResponse = this.fetch<any>('/platform/bind-resource', HTTP.POST, postBody);

    return bindResponse;
  }

  async unBindResource({
    params,
    gitAdminSecret,
    backendParamsOverrides,
  }: {
    params: BindResourceParams;
    gitAdminSecret: string;
    backendParamsOverrides?: BackendParams;
  }): Promise<any> {
    const beParams = this.getAppliedBackendParams(backendParamsOverrides);
    const postBody = {
      awsRegion: this.backendParams.awsRegion,
      awsAccount: this.backendParams.awsAccount,
      appName: beParams.appName,
      providerName: params.providerName,
      gitHost: params.gitHost,
      gitProjectGroup: params.gitProjectGroup,
      gitRepoName: params.gitRepoName,
      gitAdminSecret,
      envName: params.envName,
      policies: params.policies,
      resourceName: params.resourceName,
      resourceEntityRef: params.resourceEntityRef
    }

    const unBindResponse = this.fetch<any>('/platform/unbind-resource', HTTP.POST, postBody);

    return unBindResponse;
  }

  async updateProviderToEnvironment({
    gitHost,
    gitRepoName,
    provider,
    gitProjectGroup,
    gitAdminSecret,
    envName,
    action,
    backendParamsOverrides,
  }: {
    gitHost: string;
    gitRepoName: string;
    provider: AWSEnvironmentProviderRecord
    gitProjectGroup: string;
    gitAdminSecret: string;
    envName: string;
    action: string;
    backendParamsOverrides: BackendParams;
  }): Promise<any> {
    const beParams = this.getAppliedBackendParams(backendParamsOverrides);
    const postBody = {
      ...beParams,
      provider,
      gitHost,
      gitProjectGroup,
      gitRepoName,
      gitAdminSecret,
      envName,
      action
    }

    const addProviderResponse = this.fetch<any>('/platform/update-provider', HTTP.POST, postBody);
    return addProviderResponse
  }

  async deleteProvider({
    stackName,
    accessRole,
    backendParamsOverrides,
  }: {
    stackName: string;
    accessRole: string;
    backendParamsOverrides: BackendParams;
  }): Promise<DeleteStackCommandOutput> {
    const beParams = this.getAppliedBackendParams(backendParamsOverrides);
    const postBody = {
      ...beParams,
      stackName,
      accessRole
    }

    const deleteResponse = this.fetch<DeleteStackCommandOutput>('/platform/delete-stack', HTTP.POST, postBody);

    return deleteResponse;
  }

  deleteTFProvider({
    backendParamsOverrides,
    gitHost,
    gitRepoName,
    gitProjectGroup,
    gitAdminSecret,
    envName,
  }: {
    backendParamsOverrides: BackendParams;
    gitHost: string;
    gitRepoName: string;
    gitProjectGroup: string;
    gitAdminSecret: string;
    envName: string;
  }): Promise<any> {
    const beParams = this.getAppliedBackendParams(backendParamsOverrides);
    const postBody = {
      ...beParams,
      gitHost,
      gitRepoName,
      gitProjectGroup,
      gitAdminSecret,
      envName
    }

    const deleteResponse = this.fetch<any>('/platform/delete-tf-provider', HTTP.POST, postBody);

    return deleteResponse;
  }

  async deletePlatformSecret({
    secretName
  }: {
    secretName: string;
  }): Promise<DeleteSecretCommandOutput> {
    const postBody = {
      awsRegion: this.platformRegion,
      awsAccount: '',
      appName: this.platformAppName,
      prefix: '',
      providerName: '',
      secretName
    }

    const deleteResponse = this.fetch<DeleteSecretCommandOutput>('/platform/delete-secret', HTTP.POST, postBody);

    return deleteResponse;

  };

  async deleteRepository({
    gitHost,
    gitProject,
    gitRepoName,
    gitAdminSecret,
    backendParamsOverrides,
  }: {
    gitHost: string;
    gitProject: string;
    gitRepoName: string;
    gitAdminSecret: string;
    backendParamsOverrides?: BackendParams;
  }): Promise<any> {
    const beParams = this.getAppliedBackendParams(backendParamsOverrides);
    const postBody = {
      ...beParams,
      gitHost,
      gitProject,
      gitRepoName,
      gitAdminSecret
    }
    const deleteResponse = this.fetch<any>('/platform/delete-repository', HTTP.POST, postBody);
    return deleteResponse;
  }

  async getStackDetails({
    stackName,
    backendParamsOverrides,
  }: {
    stackName: string;
    backendParamsOverrides?: BackendParams;
  }): Promise<Stack> {
    const beParams = this.getAppliedBackendParams(backendParamsOverrides);
    const path = '/cloudformation/describeStack';

    const stack = this.fetch<Stack>(path, HTTP.POST, {
      ...beParams,
      stackName,
    });

    return stack;
  }

  async getStackEvents(
    { stackName, backendParamsOverrides, }: { stackName: string; backendParamsOverrides?: BackendParams; })
    : Promise<DescribeStackEventsCommandOutput> {
    const beParams = this.getAppliedBackendParams(backendParamsOverrides);
    const path = '/cloudformation/describeStackEvents';

    const stack = this.fetch<DescribeStackEventsCommandOutput>(path, HTTP.POST, {
      ...beParams,
      stackName,
    });

    return stack;
  }

  async updateStack({
    componentName,
    stackName,
    s3BucketName,
    cfFileName,
    environmentName,
    gitHost,
    gitProjectGroup,
    gitRepoName,
    gitAdminSecret,
    backendParamsOverrides,
  }: {
    componentName: string;
    stackName: string;
    s3BucketName: string;
    cfFileName: string;
    environmentName?: string;
    gitHost?: string;
    gitProjectGroup?: string;
    gitRepoName?: string;
    gitAdminSecret?: string;
    backendParamsOverrides?: BackendParams;
  }): Promise<UpdateStackCommandOutput> {
    const beParams = this.getAppliedBackendParams(backendParamsOverrides);
    const path = '/cloudformation/updateStack';

    const stack = this.fetch<UpdateStackCommandOutput>(path, HTTP.POST, {
      ...beParams,
      componentName,
      stackName,
      s3BucketName,
      cfFileName,
      gitHost,
      gitProjectGroup,
      gitRepoName,
      gitAdminSecret,
      environmentName,
    });

    return stack;
  }

  async createStack({
    componentName,
    stackName,
    s3BucketName,
    cfFileName,
    environmentName,
    gitHost,
    gitProjectGroup,
    gitRepoName,
    gitAdminSecret,
    backendParamsOverrides,
  }: {
    componentName: string;
    stackName: string;
    s3BucketName: string;
    cfFileName: string;
    environmentName?: string;
    gitHost?: string;
    gitProjectGroup?: string;
    gitRepoName?: string;
    gitAdminSecret?: string;
    backendParamsOverrides?: BackendParams;
  }): Promise<CreateStackCommandOutput> {
    const beParams = this.getAppliedBackendParams(backendParamsOverrides);
    const path = '/cloudformation/createStack';

    const stack = this.fetch<CreateStackCommandOutput>(path, HTTP.POST, {
      ...beParams,
      componentName,
      stackName,
      s3BucketName,
      cfFileName,
      gitHost,
      gitProjectGroup,
      gitRepoName,
      gitAdminSecret,
      environmentName,
    });

    return stack;
  }

  async deleteStack({
    componentName,
    stackName,
    backendParamsOverrides,
  }: {
    componentName: string;
    stackName: string;
    backendParamsOverrides?: BackendParams;
  }): Promise<DeleteStackCommandOutput> {
    const beParams = this.getAppliedBackendParams(backendParamsOverrides);
    const path = '/cloudformation/deleteStack';

    const stack = this.fetch<DeleteStackCommandOutput>(path, HTTP.POST, {
      ...beParams,
      componentName,
      stackName,
    });

    return stack;
  }

  doesS3FileExist({
    bucketName,
    fileName,
    backendParamsOverrides,
  }: {
    bucketName: string;
    fileName: string;
    backendParamsOverrides?: BackendParams;
  }): Promise<HeadObjectCommandOutput> {
    const beParams = this.getAppliedBackendParams(backendParamsOverrides);
    const path = '/s3/doesFileExist';

    const fileExistsOutput = this.fetch<HeadObjectCommandOutput>(path, HTTP.POST, {
      ...beParams,
      bucketName,
      fileName,
    });

    return fileExistsOutput;
  }

  async getResourceGroupResources({
    rscGroupArn,
    backendParamsOverrides,
  }: {
    rscGroupArn: string;
    backendParamsOverrides?: BackendParams;
  }): Promise<AWSServiceResources> {
    const beParams = this.getAppliedBackendParams(backendParamsOverrides);
    const postBody = {
      ...beParams,
      resourceGroupName: rscGroupArn,
    };

    const rscGroupDetails = this.fetch<AWSServiceResources>('/resource-group', HTTP.POST, postBody);
    return rscGroupDetails;
  }

  async getSSMParameter({
    ssmParamName,
    backendParamsOverrides,
  }: {
    ssmParamName: string;
    backendParamsOverrides?: BackendParams;
  }): Promise<GetParameterCommandOutput> {
    const beParams = this.getAppliedBackendParams(backendParamsOverrides);
    const postBody = {
      ...beParams,
      ssmParamName,
    };

    const ssmParamDetails = this.fetch<GetParameterCommandOutput>('/ssm-parameter', HTTP.POST, postBody);
    return ssmParamDetails;
  }

  async describeTaskDefinition({
    taskDefinitionArn,
    backendParamsOverrides,
  }: {
    taskDefinitionArn: string;
    backendParamsOverrides?: BackendParams;
  }): Promise<TaskDefinition> {
    const beParams = this.getAppliedBackendParams(backendParamsOverrides);
    const postBody = {
      ...beParams,
      taskDefinition: taskDefinitionArn,
    }
    const taskD = this.fetch<TaskDefinition>('/ecs/describeTaskDefinition', HTTP.POST, postBody);

    return taskD;
  }

  async updateTaskDefinition({
    taskDefinitionArn,
    envVar,
    backendParamsOverrides,
  }: {
    taskDefinitionArn: string;
    envVar: ContainerDetailsType[];
    backendParamsOverrides?: BackendParams;
  }): Promise<TaskDefinition> {
    const beParams = this.getAppliedBackendParams(backendParamsOverrides);
    const postBody = {
      ...beParams,
      taskDefinition: taskDefinitionArn,
      envVar: envVar
    }

    const taskD = this.fetch<TaskDefinition>('/ecs/updateTaskDefinition', HTTP.POST, postBody);
    return taskD;
  }

  async promoteApp({
    envName,
    envRequiresManualApproval,
    gitHost,
    gitJobID,
    gitProjectGroup,
    gitRepoName,
    gitAdminSecret,
    providersData,
  }: {
    envName: string;
    envRequiresManualApproval: boolean;
    gitHost: string;
    gitJobID: string;
    gitProjectGroup: string;
    gitRepoName: string;
    gitAdminSecret: string;
    providersData: AWSProviderParams[];
  }): Promise<any> {
    const postBody = {
      awsRegion: this.backendParams.awsRegion,
      awsAccount: this.backendParams.awsAccount,
      appName: this.backendParams.appName,
      envName,
      envRequiresManualApproval,
      gitHost,
      gitJobID,
      gitProjectGroup,
      gitRepoName,
      gitAdminSecret,
      providers: providersData
    }
    const results = this.fetch<any>('/git/promote', HTTP.POST, postBody);
    return results;
  }

  async invokeLambda({
    functionName,
    actionDescription,
    body,
    backendParamsOverrides
  }: {
    functionName: string;
    actionDescription: string;
    body: string;
    backendParamsOverrides?: BackendParams;
  }): Promise<InvokeCommandOutput> {
    const beParams = this.getAppliedBackendParams(backendParamsOverrides);
    const postBody = {
      ...beParams,
      functionName,
      actionDescription,
      body
    };
    // console.log(postBody)
    const lambdaResult = await this.fetch<InvokeCommandOutput>('/lambda/invoke', HTTP.POST, postBody);
    return lambdaResult;
  }

  async getEKSAppManifests({
    envName,
    gitAdminSecret,
    platformSCMConfig,
    backendParamsOverrides
  }: {
    envName: string;
    gitAdminSecret: string;
    platformSCMConfig: PlatformSCMParams;
    backendParamsOverrides?: BackendParams;
  }): Promise<any> {
    const beParams = this.getAppliedBackendParams(backendParamsOverrides);
    // Fetch current config
    const postBody = {
      ...beParams,
      envName,
      gitAdminSecret,
      platformSCMConfig
    };

    // console.log(postBody)
    let configResult = await this.fetch<any>('/platform/fetch-eks-config', HTTP.POST, postBody);
    // console.log(configResult);

    return configResult;
  }

  async updateEKSApp({
    actionDescription,
    envName,
    cluster,
    updateKey,
    updateValue,
    kubectlLambda,
    lambdaRoleArn,
    gitAdminSecret,
    platformSCMConfig,
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
    platformSCMConfig: PlatformSCMParams;
    backendParamsOverrides?: BackendParams;
  }): Promise<any> {
    let configResult = await this.getEKSAppManifests({
      envName,
      gitAdminSecret,
      platformSCMConfig,
      backendParamsOverrides
    });

    const updateKeyArray = updateKey.split('.');
    Object.values(configResult).forEach(value => {
      let currObj: any = value;
      for (let i = 0; i < updateKeyArray.length; i++) {
        const currKey = updateKeyArray[i];
        if (currObj.hasOwnProperty(currKey)) {
          // console.log(currKey)
          // console.log(currObj)
          if (i === updateKeyArray.length - 1) {
            // console.log(`key ${currKey} found , current value ${currObj[currKey]}`)
            currObj[currKey] = updateValue
            // console.log(`Updating key ${currKey} found , current value ${currObj[currKey]}`)

          } else {
            currObj = currObj[currKey]
          }
        }
        else {
          break
        }
      }
    })
    // console.log(configResult)

    //make changes to config
    const manifest = JSON.stringify(configResult)
    const bodyParam = {
      RequestType: "Update",
      ResourceType: "Custom::AWSCDK-EKS-KubernetesResource",
      ResourceProperties: {
        TimeoutSeconds: "5",
        ClusterName: cluster,
        RoleArn: lambdaRoleArn,
        InvocationType: 'RequestResponse',
        Manifest: manifest,
      }
    };

    const configUpdateResult = await this.invokeLambda({
      functionName: kubectlLambda,
      actionDescription,
      body: JSON.stringify(bodyParam)
    })

    return configUpdateResult;
  }

  private async fetch<T>(path: string, method = HTTP.GET, data?: any): Promise<T> {
    const baseUrl = `${await this.configApi.getString('backend.baseUrl')}/api/aws-apps-backend`;
    const url = baseUrl + path;

    let headers: { [k: string]: string } = {};

    let requestOptions: RequestInit = {
      method,
      headers,
    };

    if (data) {
      requestOptions.body = JSON.stringify(data);
      headers['Content-Type'] = 'application/json';
    }
    const response = await this.fetchApi.fetch(url, requestOptions);

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
