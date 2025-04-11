import { CreateSecretCommandOutput, GetSecretValueCommandOutput, PutSecretValueCommandOutput } from "@aws-sdk/client-secrets-manager";
import { AwsAuditRequest, AwsAuditResponse } from "../../api/aws-audit";
import {
  PutItemCommandOutput,
  ScanCommandOutput,
} from '@aws-sdk/client-dynamodb';
import {
  DescribeTaskDefinitionCommandOutput,
  DescribeTasksCommandOutput,
  ListTasksCommandOutput,
  RegisterTaskDefinitionCommandOutput,
  TaskDefinition,
  UpdateServiceCommandOutput,
} from '@aws-sdk/client-ecs';
import {
  ListGroupResourcesCommandOutput,
} from '@aws-sdk/client-resource-groups';
import { CreateBucketCommandOutput, HeadObjectCommandOutput } from "@aws-sdk/client-s3";
import { DescribeLogGroupsCommandOutput, DescribeLogStreamsCommandOutput, GetLogEventsCommandOutput, GetLogRecordCommandOutput } from "@aws-sdk/client-cloudwatch-logs";
import { DynamoDBTableData } from "../../api/AwsAppsApi";
import { AWSServiceResources } from "@aws/plugin-aws-apps-common-for-backstage";
import { GetParameterCommandOutput } from "@aws-sdk/client-ssm";
import { CreateStackCommandOutput, DeleteStackCommandOutput, DescribeStackEventsCommandOutput, DescribeStacksCommandOutput, Parameter, UpdateStackCommandOutput } from "@aws-sdk/client-cloudformation";
import { DescribeClusterCommandOutput } from "@aws-sdk/client-eks";
import { InvokeCommandOutput } from "@aws-sdk/client-lambda";
import { AwsCredentialIdentity } from "@aws-sdk/types";

export interface IAWSSDKService {
  
  readonly awsRegion: string;
  readonly awsAccount: string;
  readonly awsCredentials: AwsCredentialIdentity;

  setAwsCredentials(credentials: AwsCredentialIdentity): void;
  setAwsRegion(region: string): void;
  setAwsAccount(account: string): void;
  
    createAuditRecord({
      envProviderPrefix,
      envProviderName,
      appName,
      apiClient,
      roleArn,
      awsRegion,
      awsAccount,
      requester,
      owner,
      actionType,
      actionName,
      requestArgs,
      status,
      message,
    }: AwsAuditRequest): Promise<AwsAuditResponse>;
  
    getEcsServiceTask(clusterName: string, serviceName: string): Promise<ListTasksCommandOutput>;
    describeClusterTasks(clusterName: string, taskArns: string[]): Promise<DescribeTasksCommandOutput>;
    updateServiceTask(clusterName: string, serviceName: string, taskDefinition: string, restart: boolean, numberOfTasks?: number | undefined): Promise<UpdateServiceCommandOutput>;
    getSecretValue(secretArn: string): Promise<GetSecretValueCommandOutput>;
    createSecret(secretName: string, description: string, tags?: { Key: string, Value: string | number | boolean }[]): Promise<CreateSecretCommandOutput>;
    putSecretValue(secretArn: string, secretValue: string): Promise<PutSecretValueCommandOutput>;
    createS3Bucket(bucketName: string, tags?: { Key: string, Value: string | number | boolean }[]): Promise<CreateBucketCommandOutput>;
    doesS3FileExist(bucketName: string, fileName: string): Promise<HeadObjectCommandOutput>;
    getLogGroups(logPrefix: string): Promise<DescribeLogGroupsCommandOutput>;
    getLogStreams(logGroupName: string): Promise<DescribeLogStreamsCommandOutput>;
    getLogGroupEvents(logGroupName: string, logStreamName: string, startFromHead?: boolean): Promise<GetLogEventsCommandOutput>;
    getLogRecord(logRecordPointer: string): Promise<GetLogRecordCommandOutput>;
    getDynamodbTable(tableName: string, appName: string, timeFrame: number): Promise<ScanCommandOutput>; 
    putDynamodbTableData(data: DynamoDBTableData): Promise<PutItemCommandOutput>;
    getResourceGroupResources(resourceGroupName: string): Promise<ListGroupResourcesCommandOutput>;
    getCategorizedResources(resourceGroup: string): Promise<AWSServiceResources>;
    getSSMParameter(ssmParamName: string): Promise<GetParameterCommandOutput>;
    describeTaskDefinition(taskDefinitionArn: string): Promise<DescribeTaskDefinitionCommandOutput>;
    registerTaskDefinition(taskDefinition: TaskDefinition): Promise<RegisterTaskDefinitionCommandOutput>;
    describeStack(stackName: string): Promise<DescribeStacksCommandOutput>;
    describeStackEvents(stackName: string): Promise<DescribeStackEventsCommandOutput>;
    updateStack(componentName: string, stackName: string, s3BucketName: string, cfFileName: string, providerName: string, parameters?: Parameter[] ): Promise<UpdateStackCommandOutput>;
    createStack(componentName: string, stackName: string, s3BucketName: string, cfFileName: string, providerName: string, parameters?: Parameter[] ): Promise<CreateStackCommandOutput>
    deleteStack(stackName: string): Promise<DeleteStackCommandOutput>;
    getEksCluster(clusterName: string): Promise<DescribeClusterCommandOutput>;
    callLambda(functionName: string, body: string) :Promise<InvokeCommandOutput>;
  }
  