// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Entity } from '@backstage/catalog-model';
import { Task, Service, TaskDefinition } from '@aws-sdk/client-ecs';
import { BAWSApi } from '../api';
import { GetSecretValueCommandOutput } from '@aws-sdk/client-secrets-manager';
import { LogStream } from '@aws-sdk/client-cloudwatch-logs';
import { AWSServiceResources } from '@aws/plugin-aws-apps-common';
import { GetParameterCommandOutput } from '@aws-sdk/client-ssm';
import { ContainerDetailsType } from '../types';
import { ScanCommandOutput } from '@aws-sdk/client-dynamodb';
import { CreateStackCommandOutput, DeleteStackCommandOutput, DescribeStackEventsCommandOutput, Stack, UpdateStackCommandOutput } from '@aws-sdk/client-cloudformation';
import { HeadObjectCommandOutput } from '@aws-sdk/client-s3';

export class MockEcsService implements BAWSApi {

  getStackEvents({ stackName, account, region, }: { stackName: string; account: string; region: string; }): Promise<DescribeStackEventsCommandOutput> {
    console.log(stackName, account, region);
    throw new Error('Method not implemented.');
  }
  updateStack({ componentName, stackName, s3BucketName, cfFileName, account, region, }: { componentName: string; stackName: string; s3BucketName: string; cfFileName: string; account: string; region: string; }): Promise<UpdateStackCommandOutput> {
    console.log(componentName, stackName, s3BucketName, cfFileName, account, region);
    throw new Error('Method not implemented.');
  }
  createStack({ componentName, stackName, s3BucketName, cfFileName, account, region, }: { componentName: string; stackName: string; s3BucketName: string; cfFileName: string; account: string; region: string; }): Promise<CreateStackCommandOutput> {
    console.log(componentName, stackName, s3BucketName, cfFileName, account, region);
    throw new Error('Method not implemented.');
  }
  deleteStack({ componentName, stackName, account, region, }: { componentName: string; stackName: string; account: string; region: string; }): Promise<DeleteStackCommandOutput> {
    console.log(componentName, stackName, account, region);
    throw new Error('Method not implemented.');
  }
  doesS3FileExist({ bucketName, fileName, account, region, }: { bucketName: string; fileName: string; account: string; region: string; }): Promise<HeadObjectCommandOutput> {
    console.log(bucketName, fileName, account, region);
    throw new Error('Method not implemented.');
  }
  
  getStackDetails({ stackName, account, region, }: { stackName: string; account: string; region: string; }): Promise<Stack> {
    console.log(stackName, account, region);
    throw new Error('Method not implemented.');
  }

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
  }): Promise<TaskDefinition> {
    console.log(taskDefinitionArn, account, region, envVar);
    throw new Error('Method not implemented.');
  }
  describeTaskDefinition({
    taskDefinitionArn,
    account,
    region,
  }: {
    taskDefinitionArn: string;
    account: string;
    region: string;
  }): Promise<TaskDefinition> {
    console.log(taskDefinitionArn, account, region);
    throw new Error('Method not implemented.');
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
    const appName = mockEntity.metadata.name;
    const logStreamName = `${appName}/web/87e53d8985d2407199ac97d4b59e0a3f`;
    await sleep(2000);
    return Promise.resolve([
      {
        arn: `arn:aws:logs:${region}:${account}:log-group:${logGroupName}:log-stream:${logStreamName}`,
        creationTime: 1679438852136,
        firstEventTimestamp: 1679438877992,
        lastEventTimestamp: 1679438877996,
        lastIngestionTime: 1679438879031,
        logStreamName: logStreamName,
        storedBytes: 0,
        uploadSequenceToken: '49039859540065618685109053571939700745910250982479568477',
      },
    ]);
  }

  async getLogStreamData({
    logGroupName,
    account,
    region,
  }: {
    logGroupName: string;
    logStreamName: string;
    account: string;
    region: string;
  }): Promise<string> {
    console.log(logGroupName, account, region);
    await sleep(2000);
    return Promise.resolve('[2023-03-18 16:44:00 +0000] [1] [INFO] Starting gunicorn 20.1.0');
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
    await sleep(2000);
    return {
      $metadata: {},
      Items: [
        {
          appName: { S: appName },
          account: { S: account },
          region: { S: region },
        },
      ],
      Count: 0,
    };
  }

  async getTaskDetails({
    cluster,
    taskDefinition,
  }: // service,
  // account,
  // region,
  {
    cluster: string;
    taskDefinition: string;
    service: string;
    account: string;
    region: string;
  }): Promise<Task> {
    await sleep(2000);
    return {
      attachments: [
        {
          id: '409257af-7a8f-4308-9ef3-b7df26606255',
          type: 'ElasticNetworkInterface',
          status: 'ATTACHED',
          details: [
            {
              name: 'subnetId',
              value: 'subnet-0388ba4b0c4af4497',
            },
            {
              name: 'networkInterfaceId',
              value: 'eni-00fd0ab35132e23c8',
            },
            {
              name: 'macAddress',
              value: '0e:9a:3e:f3:b7:fb',
            },
            {
              name: 'privateDnsName',
              value: 'ip-10-0-13-92.ec2.internal',
            },
            {
              name: 'privateIPv4Address',
              value: '10.0.13.92',
            },
          ],
        },
      ],
      attributes: [
        {
          name: 'ecs.cpu-architecture',
          value: 'x86_64',
        },
      ],
      availabilityZone: 'us-east-1b',
      clusterArn: cluster,
      connectivity: 'CONNECTED',
      connectivityAt: new Date(),
      containers: [
        {
          containerArn:
            'arn:aws:ecs:us-east-1:456433905815:container/baws-solution-EcsDefaultClusterMnL3mNNYNbawssolutionnetworkVPCB1238CA6-KP4NJ2XDKayQ/7a6b3d0bd8b943fdacc66dbdb6c6bf7f/ed52f8e9-a8d5-4f2a-b175-ebbc37b2da0c',
          taskArn:
            'arn:aws:ecs:us-east-1:456433905815:task/baws-solution-EcsDefaultClusterMnL3mNNYNbawssolutionnetworkVPCB1238CA6-KP4NJ2XDKayQ/7a6b3d0bd8b943fdacc66dbdb6c6bf7f',
          name: 'web',
          image: '456433905815.dkr.ecr.us-east-1.amazonaws.com/baws-backstage:latest',
          imageDigest: 'sha256:150bdeda53d5a462457da58ea64c5480f6a89d3eac86511c2ad76f5068e70807',
          runtimeId: '7a6b3d0bd8b943fdacc66dbdb6c6bf7f-265927825',
          lastStatus: 'RUNNING',
          networkBindings: [],
          networkInterfaces: [
            {
              attachmentId: '409257af-7a8f-4308-9ef3-b7df26606255',
              privateIpv4Address: '10.0.13.92',
            },
          ],
          healthStatus: 'UNKNOWN',
          managedAgents: [
            {
              lastStartedAt: new Date(),
              name: 'ExecuteCommandAgent',
              lastStatus: 'RUNNING',
            },
          ],
          cpu: '0',
        },
      ],
      cpu: '512',
      createdAt: new Date(),
      desiredStatus: 'RUNNING',
      enableExecuteCommand: true,
      group: 'service:baws-solution-bawsfargateservicebawsbackstageService5EAAC248-iB9mmgybsNJc',
      healthStatus: 'UNKNOWN',
      lastStatus: 'RUNNING',
      launchType: 'FARGATE',
      memory: '2048',
      overrides: {
        containerOverrides: [
          {
            name: 'web',
          },
        ],
        inferenceAcceleratorOverrides: [],
      },
      platformVersion: '1.4.0',
      platformFamily: 'Linux',
      pullStartedAt: new Date(),
      pullStoppedAt: new Date(),
      startedAt: new Date(),
      startedBy: 'ecs-svc/4318665920314838241',
      tags: [],
      taskArn:
        'arn:aws:ecs:us-east-1:456433905815:task/baws-solution-EcsDefaultClusterMnL3mNNYNbawssolutionnetworkVPCB1238CA6-KP4NJ2XDKayQ/7a6b3d0bd8b943fdacc66dbdb6c6bf7f',
      taskDefinitionArn: taskDefinition,
      version: 4,
      ephemeralStorage: {
        sizeInGiB: 20,
      },
    };
  }

  async updateService({
    cluster,
    taskDefinition,
    service,
    // account,
    // region,
    desiredCount,
  }: // restart,
  {
    cluster: string;
    taskDefinition: string;
    service: string;
    account: string;
    region: string;
    desiredCount: number;
    restart: boolean;
  }): Promise<Service> {
    return {
      serviceArn:
        'arn:aws:ecs:us-east-1:456433905815:service/baws-solution-EcsDefaultCluster/bawsfargateservicebawsbackstageService',
      serviceName: service,
      clusterArn: cluster,
      loadBalancers: [
        {
          targetGroupArn:
            'arn:aws:elasticloadbalancing:us-east-1:456433905815:targetgroup/baws-s-bawsf-7AZWDFNSEODF/9bddcf39df405c9a',
          containerName: 'web',
          containerPort: 8080,
        },
      ],
      serviceRegistries: [],
      status: 'ACTIVE',
      desiredCount: desiredCount,
      runningCount: 2,
      pendingCount: 0,
      launchType: 'FARGATE',
      platformVersion: 'LATEST',
      platformFamily: 'Linux',
      taskDefinition: taskDefinition,
      deploymentConfiguration: {
        deploymentCircuitBreaker: {
          enable: false,
          rollback: false,
        },
        maximumPercent: 200,
        minimumHealthyPercent: 50,
      },
      deployments: [
        {
          id: 'ecs-svc/4318665920314838241',
          status: 'PRIMARY',
          taskDefinition:
            'arn:aws:ecs:us-east-1:456433905815:task-definition/BAWSStackbawsfargateservicebawsbackstageTaskDef3EAC56CD:41',
          desiredCount: 1,
          pendingCount: 0,
          runningCount: 2,
          failedTasks: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          launchType: 'FARGATE',
          platformVersion: '1.4.0',
          platformFamily: 'Linux',
          networkConfiguration: {
            awsvpcConfiguration: {
              subnets: ['subnet-05e6e69526601589b', 'subnet-0388ba4b0c4af4497'],
              securityGroups: ['sg-022c222969a38f239'],
              assignPublicIp: 'DISABLED',
            },
          },
          rolloutState: 'COMPLETED',
          rolloutStateReason: 'ECS deployment ecs-svc/4318665920314838241 completed.',
        },
      ],
      roleArn: 'arn:aws:iam::456433905815:role/aws-service-role/ecs.amazonaws.com/AWSServiceRoleForECS',
      createdAt: new Date(),
      placementConstraints: [],
      placementStrategy: [],
      networkConfiguration: {
        awsvpcConfiguration: {
          subnets: ['subnet-05e6e69526601589b', 'subnet-0388ba4b0c4af4497'],
          securityGroups: ['sg-022c222969a38f239'],
          assignPublicIp: 'DISABLED',
        },
      },
      healthCheckGracePeriodSeconds: 60,
      schedulingStrategy: 'REPLICA',
      deploymentController: {
        type: 'ECS',
      },
      createdBy: 'arn:aws:iam::456433905815:role/cdk-hnb659fds-cfn-exec-role-456433905815-us-east-1',
      enableECSManagedTags: false,
      propagateTags: 'NONE',
      enableExecuteCommand: true,
    };
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
    console.log(secretName, account, region);
    return {
      ARN: undefined,
      CreatedDate: undefined,
      Name: undefined,
      SecretString: undefined,
      $metadata: {},
      VersionId: undefined,
      VersionStages: undefined,
    };
  }

  async getResourceGroupResources({
    rscGroupArn,
    account,
    region,
  }: {
    rscGroupArn: string;
    account: string;
    region: string;
    // }): Promise<ListGroupResourcesCommandOutput> {
  }): Promise<AWSServiceResources> {
    console.log(rscGroupArn, account, region);
    return {
      EC2: [
        {
          resourceTypeId: 'AWS::EC2::SecurityGroup',
          resourceTypeName: 'SecurityGroup',
          resourceArn: 'arn:aws:ec2:us-east-1:123456789012:security-group/sg-0000ffccaa2277ccc',
          resourceName: 'sg-0000ffccaa2277ccc',
        },
        {
          resourceTypeId: 'AWS::EC2::SecurityGroup',
          resourceTypeName: 'SecurityGroup',
          resourceArn: 'arn:aws:ec2:us-east-1:123456789012:security-group/sg-111333bbb888555bb',
          resourceName: 'sg-111333bbb888555bb',
        },
      ],
      ElasticLoadBalancingV2: [
        {
          resourceTypeId: 'AWS::ElasticLoadBalancingV2::LoadBalancer',
          resourceTypeName: 'LoadBalancer',
          resourceArn:
            'arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/node-node-1A2B3C4D5E6F7/abcdef1234567890',
          resourceName: 'app/node-node-1A2B3C4D5E6F7/abcdef1234567890',
        },
        {
          resourceTypeId: 'AWS::ElasticLoadBalancingV2::TargetGroup',
          resourceTypeName: 'TargetGroup',
          resourceArn:
            'arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/node-2-node-ZXYWVUTSRQPONM/fedcba0987654321',
          resourceName: 'node-2-node-ZXYWVUTSRQPONM/fedcba0987654321',
        },
      ],
      ECR: [
        {
          resourceTypeId: 'AWS::ECR::Repository',
          resourceTypeName: 'Repository',
          resourceArn: 'arn:aws:ecr:us-east-1:123456789012:repository/node-testapp',
          resourceName: 'node-testapp',
        },
      ],
      ECS: [
        {
          resourceTypeId: 'AWS::ECS::Service',
          resourceTypeName: 'Service',
          resourceArn: 'arn:aws:ecs:us-east-1:123456789012:service/baws-public-dev-app-runtime-cluster/node-testapp',
          resourceName: 'baws-public-dev-app-runtime-cluster/node-testapp',
        },
        {
          resourceTypeId: 'AWS::ECS::TaskDefinition',
          resourceTypeName: 'TaskDefinition',
          resourceArn:
            'arn:aws:ecs:us-east-1:123456789012:task-definition/nodetestappecsresourcesnodetestappecspatternTaskDef88888888:1',
          resourceName: 'nodetestappecsresourcesnodetestappecspatternTaskDef88888888:1',
        },
      ],
      KMS: [
        {
          resourceTypeId: 'AWS::KMS::Key',
          resourceTypeName: 'Key',
          resourceArn: 'arn:aws:kms:us-east-1:123456789012:key/032f2fc6-4402-462a-9a70-228211f599ab',
          resourceName: '032f2fc6-4402-462a-9a70-228211f599ab',
        },
      ],
      Logs: [
        {
          resourceTypeId: 'AWS::Logs::LogGroup',
          resourceTypeName: 'LogGroup',
          resourceArn:
            'arn:aws:logs:us-east-1:123456789012:log-group:/aws/apps/AWS-Development-Pub-Environment/AWS-Development-Pub-Environment-Provider/node-testapp',
          resourceName:
            '/aws/apps/AWS-Development-Pub-Environment/AWS-Development-Pub-Environment-Provider/node-testapp',
        },
      ],
      ResourceGroups: [
        {
          resourceTypeId: 'AWS::ResourceGroups::Group',
          resourceTypeName: 'Group',
          resourceArn: 'arn:aws:resource-groups:us-east-1:123456789012:group/node-testapp-rg',
          resourceName: 'node-testapp-rg',
        },
      ],
    };
  }

  async getSSMParameter({
    ssmParamName,
    account,
    region,
  }: {
    ssmParamName: string;
    account: string;
    region: string;
  }): Promise<GetParameterCommandOutput> {
    console.log(ssmParamName, account, region);
    return {
      $metadata: {},
      Parameter: {
        ARN: 'arn:aws:ssm:us-east-1:123456789012:parameter/path/to/parameter',
        Name: '/path/to/parameter',
        Type: 'SecureString',
        Value: 'super secret string',
        DataType: 'text',
      },
    };
  }
}

export const mockEntity: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'example-aws-app',
    description: 'An example app that is deployable to AWS',
    tags: ['aws', 'python'],
    annotations: {
      'aws.amazon.com/aws-ecs-cluster-arn':
        'arn:aws:ecs:us-east-1:123456789012:cluster/aws-demo-EcsDefaultCluster-KIZ6jw80qFze',
      'aws.amazon.com/aws-ecs-service-arn':
        'arn:aws:ecs:us-east-1:123456789012:service/aws-demo-EcsDefaultCluster-KIZ6jw80qFze/aws-example-app-Service-WjM4KHt4caLo',
      'aws.amazon.com/aws-ecs-task-definition-arn':
        'arn:aws:ecs:us-east-1:456433905815:task-definition/BAWSStackbawsfargateservicebawsbackstageTaskDef3EAC56CD:41',
      'aws.amazon.com/aws-log-group-arn':
        'arn:aws:logs:us-east-1:123456789012:log-group:aws-example-app-log-group-TaskDefLogGroup-QLuHT2gBA6Vu:*',
      'aws.amazon.com/aws-account': '456433905815',
      'aws.amazon.com/aws-region': 'us-east-1',
      'aws.amazon.com/repo-url': 'https://git.backstage.fsi.pace.aws.dev/baws-admin/test-nodejs',
      'aws.amazon.com/aws-repo-token': 'aws-app-zahi-test-app1-access-token',
    },
    links: [
      {
        url: 'http://examplawsapp.mycompanydomain.com',
        title: 'Application Home Page',
      },
    ],
    labels: {
      pythonVersion: '3.9',
      'aws-iacType': 'cdk',
    },
  },
  relations: [
    {
      type: 'dependsOn',
      targetRef: 'awsenvironment:default/aws-development-pub-environment',
    },
    {
      type: 'ownedBy',
      targetRef: 'group:default/developers',
    },
  ],
  spec: {
    type: 'aws-app',
    owner: 'group:developers',
    lifecycle: 'experimental',
    system: 'demo',
    dependsOn: [
      'awsenvironment:AWS-Test-Pub-Environment',
      'resource:s3-example-aws-app-logs',
      'resource:rds-example-db',
    ],
  },
};

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
