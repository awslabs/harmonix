// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  Capability,
  CloudFormationClient,
  CreateStackCommand,
  CreateStackCommandOutput,
  DeleteStackCommand,
  DeleteStackCommandOutput,
  DescribeStackEventsCommand,
  DescribeStackEventsCommandOutput,
  DescribeStacksCommand,
  DescribeStacksCommandOutput,
  Parameter,
  UpdateStackCommand,
  UpdateStackCommandOutput,
} from '@aws-sdk/client-cloudformation';
import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
  DescribeLogGroupsCommandInput,
  DescribeLogGroupsCommandOutput,
  DescribeLogStreamsCommand,
  DescribeLogStreamsCommandInput,
  DescribeLogStreamsCommandOutput,
  GetLogEventsCommand,
  GetLogEventsCommandInput,
  GetLogEventsCommandOutput,
  GetLogRecordCommand,
  GetLogRecordCommandInput,
  GetLogRecordCommandOutput,
} from '@aws-sdk/client-cloudwatch-logs';
import {
  DynamoDBClient,
  PutItemCommand,
  PutItemCommandInput,
  PutItemCommandOutput,
  ScanCommand,
  ScanCommandInput,
  ScanCommandOutput,
} from '@aws-sdk/client-dynamodb';
import {
  DescribeTaskDefinitionCommand,
  DescribeTaskDefinitionCommandInput,
  DescribeTaskDefinitionCommandOutput,
  DescribeTasksCommand,
  DescribeTasksCommandInput,
  DescribeTasksCommandOutput,
  ECSClient,
  ListTasksCommand,
  ListTasksCommandInput,
  ListTasksCommandOutput,
  RegisterTaskDefinitionCommand,
  RegisterTaskDefinitionCommandInput,
  RegisterTaskDefinitionCommandOutput,
  TaskDefinition,
  UpdateServiceCommand,
  UpdateServiceCommandInput,
  UpdateServiceCommandOutput,
} from '@aws-sdk/client-ecs';
import {
  DescribeClusterCommand,
  DescribeClusterCommandInput,
  DescribeClusterCommandOutput,
  EKSClient,
} from '@aws-sdk/client-eks';
import { InvokeCommand, InvokeCommandInput, InvokeCommandOutput, LambdaClient } from '@aws-sdk/client-lambda';
import {
  ListGroupResourcesCommand,
  ListGroupResourcesCommandInput,
  ListGroupResourcesCommandOutput,
  ResourceGroupsClient,
} from '@aws-sdk/client-resource-groups';
import {
  BucketLocationConstraint,
  CreateBucketCommand,
  CreateBucketCommandInput,
  CreateBucketCommandOutput,
  HeadObjectCommand,
  HeadObjectCommandOutput,
  PutBucketTaggingCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  CreateSecretCommand,
  CreateSecretCommandInput,
  CreateSecretCommandOutput,
  GetSecretValueCommand,
  GetSecretValueCommandInput,
  GetSecretValueCommandOutput,
  PutSecretValueCommand,
  PutSecretValueCommandInput,
  PutSecretValueCommandOutput,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import {
  GetParameterCommand,
  GetParameterCommandInput,
  GetParameterCommandOutput,
  SSMClient,
} from '@aws-sdk/client-ssm';

import { parse as parseArn } from '@aws-sdk/util-arn-parser';
import { AWSServiceResources } from '@aws/plugin-aws-apps-common-for-backstage';
import { LoggerService } from '@backstage/backend-plugin-api';

import { DefaultAwsCredentialsManager } from '@backstage/integration-aws-node';
import { Config } from '@backstage/config';

/** @public */
export type DynamoDBTableData = {
  tableName: string;
  recordId: string;
  origin: string;
  prefix: string;
  appName: string;
  environmentProviderName: string;
  actionType: string;
  name: string;
  initiatedBy: string;
  owner: string;
  assumedRole: string;
  targetAccount: string;
  targetRegion: string;
  request: string;
  status: string;
  message: string;
};

/** @public */
export class AwsAppsApi {
  public constructor(
    private readonly config: Config,
    private readonly logger: LoggerService,
    private readonly awsRegion: string,
    private readonly awsAccount: string,
  ) {
    this.logger.info('Instantiating AWS Apps API with:');
    this.logger.info(`awsAccount: ${this.awsAccount}`);
    this.logger.info(`awsRegion: ${this.awsRegion}`);
  }
  /**
   * List tasks of an ECS Service
   *
   * @remarks
   * List the active running task of a giving cluster / service
   *
   * @param clusterName - The ECS Cluster name
   * @param serviceName - The ECS Service name
   * @returns The ListTasksCommandOutput object
   *
   */
  public async getEcsServiceTask(clusterName: string, serviceName: string): Promise<ListTasksCommandOutput> {
    this.logger.info('Calling getEcsServiceTask');
    // resolve ECS cluster param to value
    const clusterRef = await this.getSSMParameter(clusterName);

    const accountId = this.awsAccount;
    const awsCredentialsManager = DefaultAwsCredentialsManager.fromConfig(this.config);
    const awsCredentialProvider = await awsCredentialsManager.getCredentialProvider({
      accountId,
    });
    const client = new ECSClient({
      region: this.awsRegion,
      credentialDefaultProvider: () => awsCredentialProvider.sdkCredentialProvider,
    });
    const params: ListTasksCommandInput = {
      cluster: clusterRef.Parameter?.Value?.toString() ?? '',
      serviceName: serviceName,
    };
    const command = new ListTasksCommand(params);
    return client.send(command);
  }
  /**
   * Describes tasks of an ECS Service
   *
   * @remarks
   * Describe the active running tasks of a giving cluster
   *
   * @param clusterName - The ECS Cluster name
   * @param taskArns - List of Task ARNs
   * @returns The DescribeTasksCommand object
   *
   */
  public async describeClusterTasks(clusterName: string, taskArns: string[]): Promise<DescribeTasksCommandOutput> {
    this.logger.info('Calling describeClusterTasks');
    // resolve ECS cluster param to value
    const clusterRef = await this.getSSMParameter(clusterName);

    const accountId = this.awsAccount;
    const awsCredentialsManager = DefaultAwsCredentialsManager.fromConfig(this.config);
    const awsCredentialProvider = await awsCredentialsManager.getCredentialProvider({
      accountId,
    });
    const client = new ECSClient({
      region: this.awsRegion,
      credentialDefaultProvider: () => awsCredentialProvider.sdkCredentialProvider,
    });
    const params: DescribeTasksCommandInput = {
      cluster: clusterRef.Parameter?.Value?.toString() ?? '',
      tasks: taskArns,
    };
    const command = new DescribeTasksCommand(params);
    return client.send(command);
  }
  /**
   * Update an ECS Service with desire task number.
   *
   * @remarks
   * Update an ECS Service with desire task number.
   *
   * @param clusterName - The ECS Cluster name
   * @param serviceName - The ECS Service name
   * @param taskDefinition - The name of the ECS task definition
   * @param restart - Enable/disable task restart on new deployment
   * @param numberOfTasks - The number of tasks desired - use 0 or 1 to reset
   * @returns The UpdateServiceCommandOutput object
   *
   */
  public async updateServiceTask(
    clusterName: string,
    serviceName: string,
    taskDefinition: string,
    restart: boolean,
    numberOfTasks?: number | undefined,
  ): Promise<UpdateServiceCommandOutput> {
    this.logger.info('Calling updateServiceTask');
    // resolve ECS cluster param to value
    const clusterRef = await this.getSSMParameter(clusterName);

    const accountId = this.awsAccount;
    const awsCredentialsManager = DefaultAwsCredentialsManager.fromConfig(this.config);
    const awsCredentialProvider = await awsCredentialsManager.getCredentialProvider({
      accountId,
    });
    const client = new ECSClient({
      region: this.awsRegion,
      credentialDefaultProvider: () => awsCredentialProvider.sdkCredentialProvider,
    });
    const params: UpdateServiceCommandInput = {
      cluster: clusterRef.Parameter?.Value?.toString() ?? '',
      service: serviceName,
      desiredCount: numberOfTasks,
      forceNewDeployment: restart,
      taskDefinition: taskDefinition,
    };
    const command = new UpdateServiceCommand(params);
    return client.send(command);
  }
  /**
   * Get SecretsManager Secret value.
   *
   * @remarks
   * Get SecretsManager Secret value.
   *
   * @param secretArn - The Arn of the secret to retrieve
   * @returns The GetSecretValueCommandOutput object
   *
   */
  public async getSecretValue(secretArn: string): Promise<GetSecretValueCommandOutput> {
    this.logger.info('Calling getSecretValue');

    const accountId = this.awsAccount;
    const awsCredentialsManager = DefaultAwsCredentialsManager.fromConfig(this.config);
    const awsCredentialProvider = await awsCredentialsManager.getCredentialProvider({
      accountId,
    });
    const client = new SecretsManagerClient({
      region: this.awsRegion,
      credentialDefaultProvider: () => awsCredentialProvider.sdkCredentialProvider,
    });
    const params: GetSecretValueCommandInput = {
      SecretId: secretArn,
    };
    const command = new GetSecretValueCommand(params);
    return client.send(command);
  }

  /**
   *
   * @remarks
   * create SecretsManager Secret.
   *
   * @param secretName - The name of the secret
   * @param description - The description of the secret
   * @param tags - The tags allocated to the secret
   * @returns The CreateSecretCommandOutput object
   *
   */
  public async createSecret(
    secretName: string,
    description: string,
    tags?: { Key: string; Value: string | number | boolean }[],
  ): Promise<CreateSecretCommandOutput> {
    this.logger.info('Calling create Secret');

    // convert tags to SecretsManager.Tag format
    const resourceTags = tags?.map(tag => {
      return { Key: tag.Key, Value: tag.Value.toString() };
    });

    const accountId = this.awsAccount;
    const awsCredentialsManager = DefaultAwsCredentialsManager.fromConfig(this.config);
    const awsCredentialProvider = await awsCredentialsManager.getCredentialProvider({
      accountId,
    });
    const client = new SecretsManagerClient({
      region: this.awsRegion,
      credentialDefaultProvider: () => awsCredentialProvider.sdkCredentialProvider,
    });
    const params: CreateSecretCommandInput = {
      Name: secretName,
      Description: description,
      AddReplicaRegions: [{ Region: 'us-west-2' }],
      Tags: resourceTags,
    };
    const command = new CreateSecretCommand(params);
    try {
      return await client.send(command);
    } catch (error: any) {
      throw Error(`Error creating Secret - ${error.toString()}`);
    }
  }
  /**
   *
   * @remarks
   * put SecretsManager Secret value.
   *
   * @param secretArn - The ARN of the secret
   * @param secretValue - The Secret value to put
   * @returns The CreateSecretCommandOutput object
   *
   */
  public async putSecretValue(secretArn: string, secretValue: string): Promise<PutSecretValueCommandOutput> {
    this.logger.info('Calling put Secret');

    const accountId = this.awsAccount;
    const awsCredentialsManager = DefaultAwsCredentialsManager.fromConfig(this.config);
    const awsCredentialProvider = await awsCredentialsManager.getCredentialProvider({
      accountId,
    });
    const client = new SecretsManagerClient({
      region: this.awsRegion,
      credentialDefaultProvider: () => awsCredentialProvider.sdkCredentialProvider,
    });
    const params: PutSecretValueCommandInput = {
      SecretId: secretArn,
      SecretString: secretValue,
    };
    const command = new PutSecretValueCommand(params);
    try {
      return await client.send(command);
    } catch (error) {
      throw Error('Error updating secret value');
    }
  }
  /**
   *
   * @remarks
   * create an S3 bucket.
   *
   * @param bucketName - The name of the bucket
   * @param tags - tags allocated to the bucket
   * @returns The CreateBucketCommandOutput object
   *
   */
  public async createS3Bucket(
    bucketName: string,
    tags?: { Key: string; Value: string | number | boolean }[],
  ): Promise<CreateBucketCommandOutput> {
    this.logger.info('Calling create S3 bucket');

    const fullBucketName = `${bucketName}-${this.awsAccount}-${this.awsRegion}`;

    const resourceTags = tags?.map(tag => {
      return { Key: tag.Key, Value: tag.Value.toString() };
    });

    const accountId = this.awsAccount;
    const awsCredentialsManager = DefaultAwsCredentialsManager.fromConfig(this.config);
    const awsCredentialProvider = await awsCredentialsManager.getCredentialProvider({
      accountId,
    });
    const client = new S3Client({
      region: this.awsRegion,
      credentialDefaultProvider: () => awsCredentialProvider.sdkCredentialProvider,
    });
    const createInput: CreateBucketCommandInput = {
      Bucket: fullBucketName,
    };

    // For some reason, the sdk gives an error if you set the LocationConstraint
    // to use us-east-1
    // See https://github.com/aws/aws-sdk-js/issues/3647
    if (this.awsRegion !== 'us-east-1') {
      createInput.CreateBucketConfiguration = {
        LocationConstraint: BucketLocationConstraint[this.awsRegion as keyof typeof BucketLocationConstraint],
      };
    }

    const command = new CreateBucketCommand(createInput);
    const response = await client.send(command);

    const tagInput = {
      Bucket: fullBucketName,
      Tagging: {
        TagSet: resourceTags,
      },
    };

    const tagCommand = new PutBucketTaggingCommand(tagInput);
    await client.send(tagCommand);

    return response;
  }
  /**
   *
   * @remarks
   * checks if a file exists in an S3 bucket.
   *
   * @param bucketName - The name of the bucket
   * @param fileName - The name of the file
   * @returns The HeadObjectCommandOutput object
   *
   */
  public async doesS3FileExist(bucketName: string, fileName: string): Promise<HeadObjectCommandOutput> {
    this.logger.info('Calling doesS3FileExist');

    const accountId = this.awsAccount;
    const awsCredentialsManager = DefaultAwsCredentialsManager.fromConfig(this.config);
    const awsCredentialProvider = await awsCredentialsManager.getCredentialProvider({
      accountId,
    });
    const client = new S3Client({
      region: this.awsRegion,
      credentialDefaultProvider: () => awsCredentialProvider.sdkCredentialProvider,
    });

    const input = {
      Bucket: bucketName,
      Key: fileName,
    };
    const command = new HeadObjectCommand(input);
    return client.send(command);
  }
  /**
   * Get CloudWatch log groups metadata array based on the supplied logPrefix.
   *
   * @remarks
   * Get Log Group Resources matching a given prefix.
   *
   * @param logPrefix - The log group prefix to search by
   * @returns The DescribeLogGroupsCommandOutput object
   *
   */
  public async getLogGroups(logPrefix: string): Promise<DescribeLogGroupsCommandOutput> {
    this.logger.info('Calling getLogGroups');

    const accountId = this.awsAccount;
    const awsCredentialsManager = DefaultAwsCredentialsManager.fromConfig(this.config);
    const awsCredentialProvider = await awsCredentialsManager.getCredentialProvider({
      accountId,
    });
    const client = new CloudWatchLogsClient({
      region: this.awsRegion,
      credentialDefaultProvider: () => awsCredentialProvider.sdkCredentialProvider,
    });
    const params: DescribeLogGroupsCommandInput = {
      logGroupNamePrefix: logPrefix,
    };
    const command = new DescribeLogGroupsCommand(params);
    return client.send(command);
  }
  /**
   * Get the metadata of the CloudWatch log group streams.
   *
   * @remarks
   * Get Log Group Stream metadata.
   *
   * @param logGroupName - The log group name to search by
   * @returns The DescribeLogStreamsCommandOutput object
   *
   */
  public async getLogStreams(logGroupName: string): Promise<DescribeLogStreamsCommandOutput> {
    this.logger.info('Calling getLogStreams');

    const accountId = this.awsAccount;
    const awsCredentialsManager = DefaultAwsCredentialsManager.fromConfig(this.config);
    const awsCredentialProvider = await awsCredentialsManager.getCredentialProvider({
      accountId,
    });
    const client = new CloudWatchLogsClient({
      region: this.awsRegion,
      credentialDefaultProvider: () => awsCredentialProvider.sdkCredentialProvider,
    });
    const params: DescribeLogStreamsCommandInput = {
      logGroupName,
      orderBy: 'LastEventTime',
      descending: true,
    };
    const command = new DescribeLogStreamsCommand(params);
    return client.send(command);
  }
  /**
   * Get CloudWatch log group streams content.
   *
   * @remarks
   * Get Log Stream content.
   *
   * @param logGroupName - The log group name to search by
   * @param logStreamName - The log stream name to retrieve events from
   * @param startFromHead - If the value is true, the earliest log events are returned first. If the value is false, the latest log events are returned first. The default value is true.
   * @returns The GetLogEventsCommandOutput object
   *
   */
  public async getLogGroupEvents(
    logGroupName: string,
    logStreamName: string,
    startFromHead = true,
  ): Promise<GetLogEventsCommandOutput> {
    this.logger.info('Calling getLogGroupEvents');

    const accountId = this.awsAccount;
    const awsCredentialsManager = DefaultAwsCredentialsManager.fromConfig(this.config);
    const awsCredentialProvider = await awsCredentialsManager.getCredentialProvider({
      accountId,
    });
    const client = new CloudWatchLogsClient({
      region: this.awsRegion,
      credentialDefaultProvider: () => awsCredentialProvider.sdkCredentialProvider,
    });
    const params: GetLogEventsCommandInput = {
      logGroupName: logGroupName,
      logStreamName: logStreamName,
      startFromHead,
    };
    const command = new GetLogEventsCommand(params);
    return client.send(command);
  }
  public async getLogRecord(logRecordPointer: string): Promise<GetLogRecordCommandOutput> {
    this.logger.info('Calling getLogRecord');

    const accountId = this.awsAccount;
    const awsCredentialsManager = DefaultAwsCredentialsManager.fromConfig(this.config);
    const awsCredentialProvider = await awsCredentialsManager.getCredentialProvider({
      accountId,
    });
    const client = new CloudWatchLogsClient({
      region: this.awsRegion,
      credentialDefaultProvider: () => awsCredentialProvider.sdkCredentialProvider,
    });
    const params: GetLogRecordCommandInput = {
      logRecordPointer: logRecordPointer,
    };
    const command = new GetLogRecordCommand(params);
    return client.send(command);
  }

  public async getDynamodbTable(tableName: string, appName: string, timeFrame: number): Promise<ScanCommandOutput> {
    this.logger.info('Calling getDynamodbTable');

    const accountId = this.awsAccount;
    const awsCredentialsManager = DefaultAwsCredentialsManager.fromConfig(this.config);
    const awsCredentialProvider = await awsCredentialsManager.getCredentialProvider({
      accountId,
    });
    const client = new DynamoDBClient({
      region: this.awsRegion,
      credentialDefaultProvider: () => awsCredentialProvider.sdkCredentialProvider,
    });
    console.log(timeFrame);
    const params: ScanCommandInput = {
      TableName: tableName,
      ExpressionAttributeValues: {
        ':appName': { S: appName },
      },
      ExpressionAttributeNames: {
        '#appName': 'appName',
      },
      FilterExpression: '#appName = :appName',
      // TODO: Add Query to fetch record by user for a giving time frame , use secondary index for time. need to calculate time backward
      // appName -> search criteria , timeframe.
    };
    const command = new ScanCommand(params);
    return client.send(command);
  }

  public async putDynamodbTableData(data: DynamoDBTableData): Promise<PutItemCommandOutput> {
    this.logger.info('Calling getDynamodbTable');

    const accountId = this.awsAccount;
    const awsCredentialsManager = DefaultAwsCredentialsManager.fromConfig(this.config);
    const awsCredentialProvider = await awsCredentialsManager.getCredentialProvider({
      accountId,
    });
    const client = new DynamoDBClient({
      region: this.awsRegion,
      credentialDefaultProvider: () => awsCredentialProvider.sdkCredentialProvider,
    });
    const params: PutItemCommandInput = {
      TableName: data.tableName,
      Item: {
        id: { S: data.recordId },
        createdAt: { S: new Date().toISOString() },
        createdDate: { S: new Date().toLocaleDateString() },
        origin: { S: data.origin },
        appName: { S: data.appName },
        actionType: { S: data.actionType },
        actionName: { S: data.name },
        initiatedBy: { S: data.initiatedBy },
        owner: { S: data.owner },
        assumedRole: { S: data.assumedRole },
        targetAccount: { S: data.targetAccount },
        targetRegion: { S: data.targetRegion },
        prefix: { S: data.prefix },
        providerName: { S: data.environmentProviderName },
        request: { S: data.request },
        status: { S: data.status },
        message: { S: data.message },
      },
    };
    const command = new PutItemCommand(params);
    return client.send(command);
  }

  /**
   * Get getResourceGroupResources.
   *
   * @remarks
   * Get Resource Group Resources .
   *
   * @param resourceGroupName - The group name to fetch resources example: aws-apps:my-app-name
   * @returns The Resources Arn associated with this group
   *
   */
  public async getResourceGroupResources(resourceGroupName: string): Promise<ListGroupResourcesCommandOutput> {
    this.logger.info('Calling getResourceGroupResources');

    const accountId = this.awsAccount;
    const awsCredentialsManager = DefaultAwsCredentialsManager.fromConfig(this.config);
    const awsCredentialProvider = await awsCredentialsManager.getCredentialProvider({
      accountId,
    });
    const client = new ResourceGroupsClient({
      region: this.awsRegion,
      credentialDefaultProvider: () => awsCredentialProvider.sdkCredentialProvider,
    });
    const params: ListGroupResourcesCommandInput = {
      Group: resourceGroupName,
    };
    const command = new ListGroupResourcesCommand(params);
    return client.send(command);
  }

  /**
   * Get getResourcesFromResourceGroup
   *
   * @remarks
   * Get resources from a named Resource Group, parses them to destructure the ResourceType, and
   * categorizes the resources by service identifier
   *
   * @returns A ServiceResources object containing the grouped services
   * @param resourceGroup - the name of the resource group
   */
  public async getCategorizedResources(resourceGroup: string): Promise<AWSServiceResources> {
    const rawResults = await this.getResourceGroupResources(resourceGroup);

    const resourceIdentifiers = rawResults.Resources ?? [];
    return resourceIdentifiers.reduce<AWSServiceResources>((acc, item): any => {
      const idObj = item.Identifier;
      if (idObj?.ResourceType) {
        const resourceTypeId = idObj.ResourceType;
        const [_, serviceName, resourceTypeName] = resourceTypeId.split('::');

        const resourceArn = idObj.ResourceArn ?? '';
        try {
          const { resource, service } = parseArn(resourceArn);
          // Use a regex pattern to extract the resource name without the service resource type
          // Most ARNs begin the resource name after a '/', but some (like CW logs) start after a ':'
          const re = /.*?([:?/])(.*)/;
          const reMatches = RegExp(re).exec(resource);
          let resourceName = reMatches ? reMatches[2] : resource;
          // Handle the exception case for SSM Parameters where path-like values need to be prefixed with '/'
          if (service === 'ssm' && resource.startsWith('parameter') && resourceName.indexOf('/') > 0) {
            resourceName = `/${resourceName}`;
          }

          if (acc[serviceName]) {
            acc[serviceName] = [
              ...acc[serviceName],
              ...[
                {
                  resourceTypeId,
                  resourceTypeName,
                  resourceArn,
                  resourceName,
                },
              ],
            ];
          } else {
            acc[serviceName] = [{ resourceTypeId, resourceTypeName, resourceArn, resourceName }];
          }
        } catch {
          throw new Error(`Invalid arn provided for ${serviceName} in resource group ${resourceGroup}`);
        }
        return acc;
      }
      throw new Error('Could not parse resource group resources response');
    }, {});
  }

  /**
   * Get getSSMParam
   *
   * @remarks
   * Get the value of an SSM Parameter
   *
   * @param ssmParamName - The name of the SSM Parameter to fetch
   * @returns The the string value of the SSM Parameter.  If the SSM Parameter is a List, then it will be a comma-separated string
   *
   */
  public async getSSMParameter(ssmParamName: string): Promise<GetParameterCommandOutput> {
    this.logger.info(`Calling getSSMParameter - ${ssmParamName}`);

    const accountId = this.awsAccount;
    const awsCredentialsManager = DefaultAwsCredentialsManager.fromConfig(this.config);
    const awsCredentialProvider = await awsCredentialsManager.getCredentialProvider({
      accountId,
    });
    const client = new SSMClient({
      region: this.awsRegion,
      credentialDefaultProvider: () => awsCredentialProvider.sdkCredentialProvider,
    });

    const params: GetParameterCommandInput = {
      Name: ssmParamName,
      WithDecryption: true,
    };
    const command = new GetParameterCommand(params);
    return client.send(command);
  }
  /**
   * Describe Task definition
   *
   *
   * @param taskDefinitionArn - The Arn for task definition
   * @returns The DescribeTaskDefinitionCommandOutput object
   *
   */
  public async describeTaskDefinition(taskDefinitionArn: string): Promise<DescribeTaskDefinitionCommandOutput> {
    this.logger.info('Calling Describe Task Definition');

    const accountId = this.awsAccount;
    const awsCredentialsManager = DefaultAwsCredentialsManager.fromConfig(this.config);
    const awsCredentialProvider = await awsCredentialsManager.getCredentialProvider({
      accountId,
    });
    const client = new ECSClient({
      region: this.awsRegion,
      credentialDefaultProvider: () => awsCredentialProvider.sdkCredentialProvider,
    });
    const params: DescribeTaskDefinitionCommandInput = {
      taskDefinition: taskDefinitionArn,
    };

    const command = new DescribeTaskDefinitionCommand(params);
    return client.send(command);
  }
  /**
   * Register Task Definition
   *
   *
   * @param taskDefinition - TaskDefinition
   * @returns The DescribeTaskDefinitionCommandOutput object
   *
   */
  public async registerTaskDefinition(taskDefinition: TaskDefinition): Promise<RegisterTaskDefinitionCommandOutput> {
    this.logger.info('Calling Register Task Definition');

    const accountId = this.awsAccount;
    const awsCredentialsManager = DefaultAwsCredentialsManager.fromConfig(this.config);
    const awsCredentialProvider = await awsCredentialsManager.getCredentialProvider({
      accountId,
    });
    const client = new ECSClient({
      region: this.awsRegion,
      credentialDefaultProvider: () => awsCredentialProvider.sdkCredentialProvider,
    });
    const registerTdParams: RegisterTaskDefinitionCommandInput = {
      containerDefinitions: taskDefinition.containerDefinitions,
      family: taskDefinition.family,
      taskRoleArn: taskDefinition.taskRoleArn,
      executionRoleArn: taskDefinition.executionRoleArn,
      networkMode: taskDefinition.networkMode,
      requiresCompatibilities: taskDefinition.requiresCompatibilities,
      cpu: taskDefinition.cpu,
      memory: taskDefinition.memory,
    };

    const registerCommand = new RegisterTaskDefinitionCommand(registerTdParams);

    return client.send(registerCommand);
  }

  /**
   * Describes a CloudFormation stack
   *
   * @remarks
   * Describe a CloudFormation stack
   *
   * @param stackName - The stack name
   * @returns The DescribeTasksCommand object
   *
   */
  public async describeStack(stackName: string): Promise<DescribeStacksCommandOutput> {
    this.logger.info('Calling describeStack');

    const accountId = this.awsAccount;
    const awsCredentialsManager = DefaultAwsCredentialsManager.fromConfig(this.config);
    const awsCredentialProvider = await awsCredentialsManager.getCredentialProvider({
      accountId,
    });
    const client = new CloudFormationClient({
      region: this.awsRegion,
      credentialDefaultProvider: () => awsCredentialProvider.sdkCredentialProvider,
    });
    const input = {
      StackName: stackName,
    };
    const command = new DescribeStacksCommand(input);
    return client.send(command);
  }

  /**
   * Gets CloudFormation stack events
   *
   * @remarks
   * Gets CloudFormation stack events
   *
   * @param stackName - The stack name
   * @returns The DescribeStackEventsCommandOutput object
   *
   */
  public async describeStackEvents(stackName: string): Promise<DescribeStackEventsCommandOutput> {
    this.logger.info('Calling describeStackEvents');

    const accountId = this.awsAccount;
    const awsCredentialsManager = DefaultAwsCredentialsManager.fromConfig(this.config);
    const awsCredentialProvider = await awsCredentialsManager.getCredentialProvider({
      accountId,
    });
    const client = new CloudFormationClient({
      region: this.awsRegion,
      credentialDefaultProvider: () => awsCredentialProvider.sdkCredentialProvider,
    });
    const input = {
      StackName: stackName,
    };
    const command = new DescribeStackEventsCommand(input);
    return client.send(command);
  }

  /**
   * Updates a CloudFormation stack
   *
   * @remarks
   * Updates a CloudFormation stack
   *
   * @param componentName - The Backstage component name
   * @param stackName - The stack name
   * @param s3BucketName - the S3 bucket
   * @param cfFileName - the SAM/CloudFormation template file name
   * @param providerName - the environment provider name
   * @param parameters - CloudFormation stack input parameters or undefined
   *
   * @returns The UpdateStackCommandOutput object
   */
  public async updateStack(
    componentName: string,
    stackName: string,
    s3BucketName: string,
    cfFileName: string,
    providerName: string,
    parameters?: Parameter[],
  ): Promise<UpdateStackCommandOutput> {
    this.logger.info('Calling updateStack');

    const accountId = this.awsAccount;
    const awsCredentialsManager = DefaultAwsCredentialsManager.fromConfig(this.config);
    const awsCredentialProvider = await awsCredentialsManager.getCredentialProvider({
      accountId,
    });
    const client = new CloudFormationClient({
      region: this.awsRegion,
      credentialDefaultProvider: () => awsCredentialProvider.sdkCredentialProvider,
    });

    const input = {
      StackName: stackName,
      TemplateURL: `https://${s3BucketName}.s3.amazonaws.com/${cfFileName}`,
      Parameters: parameters,
      Capabilities: [Capability.CAPABILITY_IAM, Capability.CAPABILITY_NAMED_IAM, Capability.CAPABILITY_AUTO_EXPAND],
      Tags: [
        {
          Key: `aws-apps:${componentName}-${providerName}`,
          Value: componentName,
        },
      ],
    };
    const command = new UpdateStackCommand(input);
    return client.send(command);
  }

  /**
   * Creates a CloudFormation stack
   *
   * @remarks
   * Creates a CloudFormation stack
   *
   * @param componentName - The Backstage component name
   * @param stackName - The stack name
   * @param s3BucketName - the S3 bucket
   * @param cfFileName - the SAM/CloudFormation template file name
   * @param providerName - the environment provider name
   * @param parameters - CloudFormation stack input parameters or undefined
   *
   * @returns The CreateStackCommandOutput object
   */
  public async createStack(
    componentName: string,
    stackName: string,
    s3BucketName: string,
    cfFileName: string,
    providerName: string,
    parameters?: Parameter[],
  ): Promise<CreateStackCommandOutput> {
    this.logger.info('Calling createStack');

    const accountId = this.awsAccount;
    const awsCredentialsManager = DefaultAwsCredentialsManager.fromConfig(this.config);
    const awsCredentialProvider = await awsCredentialsManager.getCredentialProvider({
      accountId,
    });
    const client = new CloudFormationClient({
      region: this.awsRegion,
      credentialDefaultProvider: () => awsCredentialProvider.sdkCredentialProvider,
    });

    const input = {
      StackName: stackName,
      TemplateURL: `https://${s3BucketName}.s3.amazonaws.com/${cfFileName}`,
      Parameters: parameters,
      Capabilities: [Capability.CAPABILITY_NAMED_IAM, Capability.CAPABILITY_AUTO_EXPAND],
      Tags: [
        {
          Key: `aws-apps:${componentName}-${providerName}`,
          Value: componentName,
        },
      ],
    };
    const command = new CreateStackCommand(input);
    return client.send(command);
  }

  /**
   * Deletes a CloudFormation stack
   *
   * @remarks
   * Deletes a CloudFormation stack
   *
   * @param stackName - The stack name
   * @returns The DeleteStackCommandOutput object
   *
   */
  public async deleteStack(stackName: string): Promise<DeleteStackCommandOutput> {
    this.logger.info('Calling deleteStack');

    const accountId = this.awsAccount;
    const awsCredentialsManager = DefaultAwsCredentialsManager.fromConfig(this.config);
    const awsCredentialProvider = await awsCredentialsManager.getCredentialProvider({
      accountId,
    });
    const client = new CloudFormationClient({
      region: this.awsRegion,
      credentialDefaultProvider: () => awsCredentialProvider.sdkCredentialProvider,
    });

    const input = {
      StackName: stackName,
    };
    const command = new DeleteStackCommand(input);
    return client.send(command);
  }

  /**
   * Get EKS Cluster
   *
   * @remarks
   * Get information about an EKS Cluster.
   *
   * @param clusterName - The EKS Cluster name
   * @returns The DescribeClusterCommandOutput object
   *
   */
  public async getEksCluster(clusterName: string): Promise<DescribeClusterCommandOutput> {
    this.logger.info('Calling getEksCluster');

    const accountId = this.awsAccount;
    const awsCredentialsManager = DefaultAwsCredentialsManager.fromConfig(this.config);
    const awsCredentialProvider = await awsCredentialsManager.getCredentialProvider({
      accountId,
    });
    const client = new EKSClient({
      region: this.awsRegion,
      credentialDefaultProvider: () => awsCredentialProvider.sdkCredentialProvider,
    });
    const params: DescribeClusterCommandInput = {
      name: clusterName,
    };
    const command = new DescribeClusterCommand(params);
    return client.send(command);
  }

  public async callLambda(functionName: string, body: string): Promise<InvokeCommandOutput> {
    this.logger.info('Calling callLambda');

    const accountId = this.awsAccount;
    const awsCredentialsManager = DefaultAwsCredentialsManager.fromConfig(this.config);
    const awsCredentialProvider = await awsCredentialsManager.getCredentialProvider({
      accountId,
    });
    const client = new LambdaClient({
      region: this.awsRegion,
      credentialDefaultProvider: () => awsCredentialProvider.sdkCredentialProvider,
    });

    const params: InvokeCommandInput = {
      FunctionName: functionName,
      LogType: 'Tail',
      Payload: Buffer.from(body),
      InvocationType: 'RequestResponse',
    };
    const command = new InvokeCommand(params);
    return client.send(command);
  }
}
