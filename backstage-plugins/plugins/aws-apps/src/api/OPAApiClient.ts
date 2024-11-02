// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  CreateStackCommandOutput,
  DeleteStackCommandOutput,
  DescribeStackEventsCommandOutput,
  Stack,
  UpdateStackCommandOutput,
} from '@aws-sdk/client-cloudformation';
import { LogStream } from '@aws-sdk/client-cloudwatch-logs';
import { ScanCommandOutput } from '@aws-sdk/client-dynamodb';
import { Service, Task, TaskDefinition } from '@aws-sdk/client-ecs';
import { HeadObjectCommandOutput } from '@aws-sdk/client-s3';
import {
  DeleteSecretCommandOutput,
  GetSecretValueCommandOutput,
} from '@aws-sdk/client-secrets-manager';
import { GetParameterCommandOutput } from '@aws-sdk/client-ssm';
import {
  AWSEnvironmentProviderRecord,
  AWSProviderParams,
  AWSServiceResources,
  BackendParams,
  BindResourceParams,
  IRepositoryInfo,
} from '@aws/plugin-aws-apps-common-for-backstage';
import { ConfigApi, FetchApi } from '@backstage/core-plugin-api';
import { ResponseError } from '@backstage/errors';
import { OPAApi } from '.';
import { HTTP } from '../helpers/constants';
import { ContainerDetailsType } from '../types';
import { InvokeCommandOutput } from '@aws-sdk/client-lambda';

export class OPAApiClient implements OPAApi {
  private readonly configApi: ConfigApi;
  private readonly fetchApi: FetchApi;
  private backendParams: BackendParams;
  private platformAppName: string;
  private platformRegion: string;

  public constructor(options: { configApi: ConfigApi; fetchApi: FetchApi }) {
    this.configApi = options.configApi;
    this.fetchApi = options.fetchApi;
    this.backendParams = {
      appName: '',
      awsAccount: '',
      awsRegion: '',
      prefix: '',
      providerName: '',
    };
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

  private getAppliedBackendParams(
    backendParamsOverrides?: BackendParams,
  ): BackendParams {
    if (backendParamsOverrides) {
      return backendParamsOverrides!;
    }
    return this.backendParams;
  }

  async getTaskDetails({
    cluster,
    service,
    backendParamsOverrides,
  }: {
    cluster: string;
    service: string;
    backendParamsOverrides?: BackendParams;
  }): Promise<Task> {
    const beParams = this.getAppliedBackendParams(backendParamsOverrides);

    const postBody = {
      ...beParams,
      serviceName: service,
      clusterName: cluster,
    };

    return this.fetch<Task>('/ecs', HTTP.POST, postBody);
  }

  async getAuditDetails(
    backendParamsOverrides?: BackendParams,
  ): Promise<ScanCommandOutput> {
    const body = this.getAppliedBackendParams(backendParamsOverrides);

    const path = `/audit-entries`;
    return this.fetch<ScanCommandOutput>(path, HTTP.POST, body);
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
    backendParamsOverrides?: BackendParams;
  }): Promise<Service> {
    const beParams = this.getAppliedBackendParams(backendParamsOverrides);

    const postBody = {
      ...beParams,
      clusterName: cluster,
      serviceName: service,
      taskDefinition: taskDefinition,
      restart: restart,
      desiredCount: desiredCount,
    };

    return this.fetch<Service>('/ecs/updateService', HTTP.POST, postBody);
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
    };
    return this.fetch<GetSecretValueCommandOutput>(
      '/secrets',
      HTTP.POST,
      postBody,
    );
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

    return this.fetch<LogStream[]>(path, HTTP.POST, {
      ...beParams,
      logGroupName,
    });
  }

  async getLogStreamData({
    logGroupName,
    logStreamName,
    backendParamsOverrides,
  }: {
    logGroupName: string;
    logStreamName: string;
    backendParamsOverrides?: BackendParams;
  }): Promise<string> {
    const beParams = this.getAppliedBackendParams(backendParamsOverrides);
    const path = '/logs/stream-events';

    return this.fetch<string>(path, HTTP.POST, {
      ...beParams,
      logGroupName,
      logStreamName,
    });
  }

  // TODO: Move platform calls to separate backend endpoints - interface does not require provider information
  async getPlatformSecret({
    secretName,
  }: {
    secretName: string;
  }): Promise<GetSecretValueCommandOutput> {
    const postBody = {
      ...this.backendParams,
      secretArn: secretName,
    };

    return this.fetch<GetSecretValueCommandOutput>(
      '/platform/secrets',
      HTTP.POST,
      postBody,
    );
  }

  async getPlatformSSMParam({
    paramName,
  }: {
    paramName: string;
  }): Promise<GetParameterCommandOutput> {
    const postBody = {
      ...this.backendParams,
      paramName,
    };

    return this.fetch<GetParameterCommandOutput>(
      '/platform/ssm',
      HTTP.POST,
      postBody,
    );
  }

  async bindResource({
    repoInfo,
    params,
    gitAdminSecret,
  }: {
    repoInfo: IRepositoryInfo;
    params: BindResourceParams;
    gitAdminSecret: string;
    backendParamsOverrides?: BackendParams;
  }): Promise<any> {
    const postBody = {
      ...this.backendParams,
      providerName: params.providerName,
      repoInfo,
      gitAdminSecret,
      envName: params.envName,
      policies: params.policies,
      resourceName: params.resourceName,
      resourceEntityRef: params.resourceEntityRef,
    };

    return this.fetch<any>('/platform/bind-resource', HTTP.POST, postBody);
  }

  async unBindResource({
    repoInfo,
    params,
    gitAdminSecret,
    backendParamsOverrides,
  }: {
    repoInfo: IRepositoryInfo;
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
      repoInfo,
      gitAdminSecret,
      envName: params.envName,
      policies: params.policies,
      resourceName: params.resourceName,
      resourceEntityRef: params.resourceEntityRef,
    };

    return this.fetch<any>('/platform/unbind-resource', HTTP.POST, postBody);
  }

  async updateProviderToEnvironment({
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
  }): Promise<any> {
    const beParams = this.getAppliedBackendParams(backendParamsOverrides);
    const postBody = {
      ...beParams,
      provider,
      repoInfo,
      gitAdminSecret,
      envName,
      action,
    };

    return this.fetch<any>('/platform/update-provider', HTTP.POST, postBody);
  }

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
  }): Promise<any> {
    const beParams = this.getAppliedBackendParams(backendParamsOverrides);
    const postBody = {
      ...beParams,
      repoInfo,
      gitAdminSecret,
      envName,
    };

    return this.fetch<any>('/platform/delete-tf-provider', HTTP.POST, postBody);
  }

  async deletePlatformSecret({
    secretName,
  }: {
    secretName: string;
  }): Promise<DeleteSecretCommandOutput> {
    const postBody = {
      awsRegion: this.platformRegion,
      awsAccount: '',
      appName: this.platformAppName,
      prefix: '',
      providerName: '',
      secretName,
    };

    return this.fetch<DeleteSecretCommandOutput>(
      '/platform/delete-secret',
      HTTP.POST,
      postBody,
    );
  }

  async deleteRepository({
    repoInfo,
    gitAdminSecret,
    backendParamsOverrides,
  }: {
    repoInfo: IRepositoryInfo;
    gitAdminSecret: string;
    backendParamsOverrides?: BackendParams;
  }): Promise<any> {
    const beParams = this.getAppliedBackendParams(backendParamsOverrides);
    const postBody = {
      ...beParams,
      repoInfo,
      gitAdminSecret,
    };
    return this.fetch<any>('/platform/delete-repository', HTTP.POST, postBody);
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

    return this.fetch<Stack>(path, HTTP.POST, {
      ...beParams,
      stackName,
    });
  }

  async getStackEvents({
    stackName,
    backendParamsOverrides,
  }: {
    stackName: string;
    backendParamsOverrides?: BackendParams;
  }): Promise<DescribeStackEventsCommandOutput> {
    const beParams = this.getAppliedBackendParams(backendParamsOverrides);
    const path = '/cloudformation/describeStackEvents';

    return this.fetch<DescribeStackEventsCommandOutput>(path, HTTP.POST, {
      ...beParams,
      stackName,
    });
  }

  async updateStack({
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
  }): Promise<UpdateStackCommandOutput> {
    const beParams = this.getAppliedBackendParams(backendParamsOverrides);
    const path = '/cloudformation/updateStack';

    return this.fetch<UpdateStackCommandOutput>(path, HTTP.POST, {
      ...beParams,
      componentName,
      stackName,
      s3BucketName,
      cfFileName,
      repoInfo,
      gitAdminSecret,
      environmentName,
    });
  }

  async createStack({
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
  }): Promise<CreateStackCommandOutput> {
    const beParams = this.getAppliedBackendParams(backendParamsOverrides);
    const path = '/cloudformation/createStack';

    return this.fetch<CreateStackCommandOutput>(path, HTTP.POST, {
      ...beParams,
      componentName,
      stackName,
      s3BucketName,
      cfFileName,
      repoInfo,
      gitAdminSecret,
      environmentName,
    });
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

    return this.fetch<DeleteStackCommandOutput>(path, HTTP.POST, {
      ...beParams,
      componentName,
      stackName,
    });
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

    return this.fetch<HeadObjectCommandOutput>(path, HTTP.POST, {
      ...beParams,
      bucketName,
      fileName,
    });
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

    return this.fetch<AWSServiceResources>(
      '/resource-group',
      HTTP.POST,
      postBody,
    );
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

    return this.fetch<GetParameterCommandOutput>(
      '/ssm-parameter',
      HTTP.POST,
      postBody,
    );
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
    };
    return this.fetch<TaskDefinition>(
      '/ecs/describeTaskDefinition',
      HTTP.POST,
      postBody,
    );
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
      envVar: envVar,
    };

    return this.fetch<TaskDefinition>(
      '/ecs/updateTaskDefinition',
      HTTP.POST,
      postBody,
    );
  }

  async promoteApp({
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
  }): Promise<any> {
    const postBody = {
      awsRegion: this.backendParams.awsRegion,
      awsAccount: this.backendParams.awsAccount,
      appName: this.backendParams.appName,
      envName,
      envRequiresManualApproval,
      repoInfo,
      gitAdminSecret,
      providers: providersData,
    };
    return this.fetch<any>('/git/promote', HTTP.POST, postBody);
  }

  async invokeLambda({
    functionName,
    actionDescription,
    body,
    backendParamsOverrides,
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
      body,
    };

    return await this.fetch<InvokeCommandOutput>(
      '/lambda/invoke',
      HTTP.POST,
      postBody,
    );
  }

  async getEKSAppManifests({
    envName,
    gitAdminSecret,
    repoInfo,
    backendParamsOverrides,
  }: {
    envName: string;
    gitAdminSecret: string;
    repoInfo: IRepositoryInfo;
    backendParamsOverrides?: BackendParams;
  }): Promise<any> {
    const beParams = this.getAppliedBackendParams(backendParamsOverrides);
    // Fetch current config
    const postBody = {
      ...beParams,
      envName,
      gitAdminSecret,
      repoInfo,
    };

    return await this.fetch<any>(
      '/platform/fetch-eks-config',
      HTTP.POST,
      postBody,
    );
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
    repoInfo,
    backendParamsOverrides,
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
  }): Promise<any> {
    const configResult = await this.getEKSAppManifests({
      envName,
      gitAdminSecret,
      repoInfo,
      backendParamsOverrides,
    });

    const updateKeyArray = updateKey.split('.');
    Object.values(configResult).forEach(value => {
      let currObj: any = value;
      for (let i = 0; i < updateKeyArray.length; i++) {
        const currKey = updateKeyArray[i];
        if (currObj.hasOwnProperty(currKey)) {
          if (i === updateKeyArray.length - 1) {
            currObj[currKey] = updateValue;
          } else {
            currObj = currObj[currKey];
          }
        } else {
          break;
        }
      }
    });

    // make changes to config
    const manifest = JSON.stringify(configResult);
    const bodyParam = {
      RequestType: 'Update',
      ResourceType: 'Custom::AWSCDK-EKS-KubernetesResource',
      ResourceProperties: {
        TimeoutSeconds: '5',
        ClusterName: cluster,
        RoleArn: lambdaRoleArn,
        InvocationType: 'RequestResponse',
        Manifest: manifest,
      },
    };

    return await this.invokeLambda({
      functionName: kubectlLambda,
      actionDescription,
      body: JSON.stringify(bodyParam),
    });
  }

  private async fetch<T>(
    path: string,
    method = HTTP.GET,
    data?: any,
  ): Promise<T> {
    const baseUrl = `${this.configApi.getString(
      'backend.baseUrl',
    )}/api/aws-apps-backend`;
    const url = baseUrl + path;

    const headers: { [k: string]: string } = {};

    const requestOptions: RequestInit = {
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

    const responseType = response.headers.get('Content-Type');

    if (responseType && responseType.indexOf('application/json') >= 0) {
      return (await response.json()) as Promise<T>;
    }
    return (await response.text()) as unknown as Promise<T>;
  }
}
