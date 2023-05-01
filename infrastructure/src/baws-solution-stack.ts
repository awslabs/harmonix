// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";

import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as kms from "aws-cdk-lib/aws-kms";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as customresources from "aws-cdk-lib/custom-resources";

import { BatchWriteItemInput, WriteRequest } from "aws-sdk/clients/dynamodb";
import { Construct } from "constructs";
import { BackstageFargateServiceConstruct } from "./constructs/backstage-fargate-service-construct";
import { DynamoDBConstruct } from "./constructs/dynamodb-tables-construct";
import { EcsClusterConstruct } from "./constructs/ecs-cluster-construct";
import { GitlabHostingConstruct } from "./constructs/gitlab-hosting-construct";
import { HostedZoneConstruct } from "./constructs/hostedzone-construct";
import { NetworkConstruct } from "./constructs/network-construct";
import { ProvisioningPipelineConstruct } from "./constructs/provisioning-pipeline-construct";
import { RdsConstruct } from "./constructs/rds-construct";
import { RoleConstruct, RoleConstructProps } from "./constructs/role-construct";
import { WafV2Scope, Wafv2BasicConstruct } from "./constructs/wafv2-basic-construct";
import { BackstageInfraConfig } from "./helpers/infra-config";
import { ApiGatewayDomainConstruct } from "./constructs/apigw-domain-construct";


export interface BAWSStackProps extends cdk.StackProps {
  readonly config: BackstageInfraConfig;
}

export class BAWSStack extends cdk.Stack {

  constructor(scope: Construct, id: string, props: BAWSStackProps) {
    super(scope, id, props);

    // Fetch Key name from ssm
    const kms_key_arn = ssm.StringParameter.fromStringParameterAttributes(this, "mySSMKey", {
      parameterName: `${props.config.AppPrefix}-kms-key`,
    }).stringValue;

    // Fetch encryption key for all data at rest encryption
    const key = kms.Key.fromKeyArn(this, "MyImportedKey", kms_key_arn);

    // Fetch ECR repo from ssm
    const ecr_repo = ssm.StringParameter.fromStringParameterAttributes(this, "ECRRepo", {
      parameterName: `${props.config.AppPrefix}-backstage-ecr`,
    }).stringValue;

    // Create an S3 bucket to use for network logs
    const accessLogBucket = new s3.Bucket(this, `${props.config.AppPrefix}-log-bucket`, {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
      autoDeleteObjects: true,
      versioned: true,
      enforceSSL: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      serverAccessLogsPrefix: 'serverAccessLogs',
    });

    // Instantiate hostedZone and SSL Ceritificate
    const hostedZone = new HostedZoneConstruct(this, "hostedZoneMain", {
      config: props.config,
    });

    // Create VPC for hosting backstage
    const backstageNetwork = new NetworkConstruct(this, "Backstage Network", {
      config: props.config,
      cidrRange: "10.0.0.0/20",
      isIsolated: false,
      id: "solution-network",
    });

    // Create VPC for hosting apps ENV1 - Developers
    const appsNetwork1 = new NetworkConstruct(this, "Backstage Apps Dev Network1", {
      config: props.config,
      cidrRange: "192.168.0.0/20",
      isIsolated: false,
      id: "app-dev-network1",
    });

    // Create VPC for hosting apps ENV1 - Developers - Private
    const appsNetwork2 = new NetworkConstruct(this, "Backstage Apps Dev Network2", {
      config: props.config,
      cidrRange: "192.168.2.0/20",
      isIsolated: true,
      id: "app-dev-network2",
    });

    // Create VPC for hosting apps ENV2 - QA
    const appsNetwork3 = new NetworkConstruct(this, "Backstage Apps QA Network1", {
      config: props.config,
      cidrRange: "172.16.0.0/20",
      isIsolated: false,
      id: "app-qa-network1",
    });

    // Create VPC for hosting apps ENV2 - QA - Private
    const appsNetwork4 = new NetworkConstruct(this, "Backstage Apps QA Network2", {
      config: props.config,
      cidrRange: "172.16.2.0/20",
      isIsolated: true,
      id: "app-qa-network2",
    });

    // Create VPC for hosting apps ENV3 - Prod
    const appsNetwork5 = new NetworkConstruct(this, "Backstage Apps Prod Network1", {
      config: props.config,
      cidrRange: "172.16.4.0/20",
      isIsolated: false,
      id: "app-prod-network1",
    });

    // Create VPC for hosting apps ENV3 - Prod - Private
    const appsNetwork6 = new NetworkConstruct(this, "Backstage Apps Prod Network2", {
      config: props.config,
      cidrRange: "172.16.6.0/20",
      isIsolated: true,
      id: "app-prod-network2",
    });

    // Create EC2 Hosted Gitlab
    const gitlabHostingConstruct = new GitlabHostingConstruct(this, "GitlabHosting Construct", {
      config: props.config,
      hostedZone,
      network: backstageNetwork,
      accessLogBucket,
    });

    // Create API Gateway Custom Domain for serverless dev APIs
    new ApiGatewayDomainConstruct(this, `${props.config.AppPrefix}-api-gw-custom-domain-dev`, {
      config: props.config,
      hostedZone,
      environment: "dev",
    });

    // Create API Gateway Custom Domain for serverless QA APIs
    new ApiGatewayDomainConstruct(this, `${props.config.AppPrefix}-api-gw-custom-domain-qa`, {
      config: props.config,
      hostedZone,
      environment: "qa",
    });

    // Create API Gateway Custom Domain for serverless PROD APIs
    new ApiGatewayDomainConstruct(this, `${props.config.AppPrefix}-api-gw-custom-domain-prod`, {
      config: props.config,
      hostedZone,
      environment: "prod",
    });

    // Create an ECS cluster for the app networks

    // Create an ECS cluster for the app1 (public) environment
    // We use a fargate launch-type as an example here, but it can also be an EC2 launch-type
    const publicDevAppCluster = new EcsClusterConstruct(this, `${props.config.AppPrefix}-public-dev-app-runtime`, {
      vpc: appsNetwork1.vpc,
      isFargateCluster: true,
      config: props.config,
      encryptionKey: key,
    });

    // We use an EC2 launch-type as an example here, but it can also be Fargate
    const isolatedDevAppCluster = new EcsClusterConstruct(this, `${props.config.AppPrefix}-isolated-dev-app-runtime`, {
      vpc: appsNetwork2.vpc,
      isFargateCluster: false,
      ec2MinCapacity: 0,
      ec2MaxCapacity: 2,
      ec2InstanceType: new ec2.InstanceType("t3.large"),
      ec2VpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      config: props.config,
      encryptionKey: key,
    });

    const publicQAAppCluster = new EcsClusterConstruct(this, `${props.config.AppPrefix}-public-qa-app-runtime`, {
      vpc: appsNetwork3.vpc,
      isFargateCluster: true,
      config: props.config,
      containerInsights: true,
      encryptionKey: key,
    });

    const isolatedQAAppCluster = new EcsClusterConstruct(this, `${props.config.AppPrefix}-isolated-qa-app-runtime`, {
      vpc: appsNetwork4.vpc,
      isFargateCluster: false,
      ec2MinCapacity: 0,
      ec2MaxCapacity: 2,
      ec2InstanceType: new ec2.InstanceType("t3.large"),
      ec2VpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      config: props.config,
      encryptionKey: key,
    });

    const publicPRODAppCluster = new EcsClusterConstruct(this, `${props.config.AppPrefix}-public-prod-app-runtime`, {
      vpc: appsNetwork5.vpc,
      isFargateCluster: true,
      config: props.config,
      encryptionKey: key,
    });

    const isolatedPRODAppCluster = new EcsClusterConstruct(
      this,
      `${props.config.AppPrefix}-isolated-prod-app-runtime`,
      {
        vpc: appsNetwork6.vpc,
        isFargateCluster: false,
        ec2MinCapacity: 0,
        ec2MaxCapacity: 2,
        ec2InstanceType: new ec2.InstanceType("t3.large"),
        ec2VpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
        config: props.config,
        encryptionKey: key,
      }
    );

    // Create DB for backstage platform
    const rdsConstruct = new RdsConstruct(this, "Rds-construct", {
      config: props.config,
      vpc: backstageNetwork.vpc,
      allowedIpsSg: backstageNetwork.allowedIpsSg,
      kmsKey: key,
    });

    // Reference the ECR repository for backstage container images
    // The name is exported from the 'prereq' stack
    const ecrRepository = ecr.Repository.fromRepositoryName(this, "ecr-repository", ecr_repo);

    const oktaSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      `${props.config.AppPrefix}-okta-secrets`,
      props.config.OktaConfigSecret
    );

    const gitlabAdminSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      `${props.config.AppPrefix}-admin-gitlab-secrets`,
      props.config.GitlabSecret
    );

    // Create Roles:
    // Create Master role
    const backstageMasterRole = new RoleConstruct(this, "backstage-master-role", {
      config: props.config,
      KMSkey: key,
      vpcCollection: [backstageNetwork.vpc],
      isAdmin: false,
      isRoot: true,
      ecsCollection: [],
    });

    // Create backstage Fargate Cluster fronted by an ALB with R53 records
    const backstageConstruct = new BackstageFargateServiceConstruct(this, `${props.config.AppPrefix}-fargate-service`, {
      network: backstageNetwork,
      ecrRepository,
      ecrKmsKey: key,
      accessLogBucket,
      dbCluster: rdsConstruct.cluster,
      config: props.config,
      oktaSecret,
      gitlabAdminSecret,
      taskRole: backstageMasterRole.IAMRole,
      hostedZone,
    });

    // print out ALB to access backstage
    new cdk.CfnOutput(this, "Backstage endpoint", {
      value: backstageConstruct.loadBalancer.loadBalancerDnsName,
    });

    // Create a regional WAF Web ACL for loadbalancers
    const wafConstruct = new Wafv2BasicConstruct(this, `${props.config.AppPrefix}-regional-wafAcl`, {
      wafScope: WafV2Scope.REGIONAL,
      region: cdk.Stack.of(this).region,
    });
    // Associate the web ACL with load balancers
    wafConstruct.addResourceAssociation(
      `${props.config.AppPrefix}-backstage-alb-webacl-assoc`,
      backstageConstruct.loadBalancer.loadBalancerArn
    );
    wafConstruct.addResourceAssociation(
      `${props.config.AppPrefix}-gitlab-alb-webacl-assoc`,
      gitlabHostingConstruct.loadbalancer.loadBalancerArn
    );

    // Create Apps Roles
    const appAdminRoleSeedData = this.createAppRole("admins", {
      config: props.config,
      KMSkey: key,
      vpcCollection: [
        backstageNetwork.vpc,
        appsNetwork1.vpc,
        appsNetwork2.vpc,
        appsNetwork3.vpc,
        appsNetwork4.vpc,
        appsNetwork5.vpc,
        appsNetwork6.vpc,
      ],
      isAdmin: true,
      isRoot: false,
      ecsCollection: [
        backstageConstruct.cluster,
        publicDevAppCluster.cluster,
        isolatedDevAppCluster.cluster,
        publicQAAppCluster.cluster,
        isolatedQAAppCluster.cluster,
        publicPRODAppCluster.cluster,
        isolatedPRODAppCluster.cluster,
      ],
      rootRole: backstageMasterRole.IAMRole,
    });

    const appDevRoleSeedData = this.createAppRole("developers", {
      config: props.config,
      KMSkey: key,
      vpcCollection: [appsNetwork1.vpc, appsNetwork2.vpc],
      isAdmin: false,
      isRoot: false,
      ecsCollection: [publicDevAppCluster.cluster, isolatedDevAppCluster.cluster],
      rootRole: backstageMasterRole.IAMRole,
    });

    const appTestingRoleSeedData = this.createAppRole("qa", {
      config: props.config,
      KMSkey: key,
      vpcCollection: [appsNetwork3.vpc, appsNetwork4.vpc],
      isAdmin: false,
      isRoot: false,
      ecsCollection: [publicQAAppCluster.cluster, isolatedQAAppCluster.cluster],
      rootRole: backstageMasterRole.IAMRole,
    });

    const appProdRoleSeedData = this.createAppRole("dev-ops", {
      config: props.config,
      KMSkey: key,
      vpcCollection: [appsNetwork5.vpc, appsNetwork6.vpc],
      isAdmin: false,
      isRoot: false,
      ecsCollection: [publicPRODAppCluster.cluster, isolatedPRODAppCluster.cluster],
      rootRole: backstageMasterRole.IAMRole,
    });

    // Create Solution DynamoDB Tables - SecurityRoleMapping, Audit
    const securityMappingTableConstruct = new DynamoDBConstruct(this, "security-mapping-table", {
      config: props.config,
      tableName: "SecurityMappingTable",
      kmsKey: key,
    });

    const auditTableConstruct = new DynamoDBConstruct(this, "audit-table", {
      config: props.config,
      tableName: "Audit",
      kmsKey: key,
    });

    const batchWriteRequest: BatchWriteItemInput = {
      RequestItems: {
        // ? This maybe can be done in a loop
        [securityMappingTableConstruct.table.tableName]: [
          appDevRoleSeedData,
          appProdRoleSeedData,
          appAdminRoleSeedData,
          appTestingRoleSeedData,
        ],
      },
    };
    new customresources.AwsCustomResource(this, "initDBResource", {
      onCreate: {
        service: "DynamoDB",
        action: "batchWriteItem",
        parameters: batchWriteRequest,
        physicalResourceId: customresources.PhysicalResourceId.of("initDBRoles"),
      },
      policy: customresources.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [securityMappingTableConstruct.table.tableArn],
      }),
    });

    const provisioningPipelineConstruct = new ProvisioningPipelineConstruct(this, "provisioning-pipeline", {
      auditTable: auditTableConstruct.table,
      vpc: backstageNetwork.vpc,
      config: props.config,
      encryptionKey: key,
      accessLogBucket,
    });

    // store the pipeline state machine as an SSM Parameter
    const pipelineStateMachineArn = provisioningPipelineConstruct.provisioningPipelineStateMachine.stateMachineArn;

    new ssm.StringParameter(this, "pipelineStateMachineArn", {
      description: "The Arn for the Step Functions State Machine used for the provisioning pipeline in Backstage",
      parameterName: `/${props.config.AppPrefix}/pipelineStateMachine/arn`,
      stringValue: pipelineStateMachineArn,
    });
  }

  // Given a role group generate a role item for dynamodb
  private createAppRole(roleGroup: string, props: RoleConstructProps): WriteRequest {
    const appRole = new RoleConstruct(this, `backstage-${roleGroup}-role`, props);

    return {
      PutRequest: {
        Item: {
          id: { S: `${cdk.Aws.ACCOUNT_ID}-${roleGroup}` },
          AuthProviderGroup: { S: roleGroup },
          IAMRole: { S: appRole.IAMRole.roleName },
          IAMRoleArn: { S: appRole.IAMRole.roleArn },
          Relationship: { S: "non-inherit" },
          Account: { S: cdk.Aws.ACCOUNT_ID },
          createdAt: { S: new Date().toISOString() },
        },
      },
    };
  }
}
