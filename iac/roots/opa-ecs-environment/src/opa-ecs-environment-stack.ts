// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as kms from "aws-cdk-lib/aws-kms";
import { Construct } from "constructs";
import { NetworkConstruct, OPAEnvironmentParams, EcsClusterConstruct, DynamoDBConstruct, } from '@aws/aws-app-development-common-constructs'
import { ECSProvisioningConstruct } from './constructs/ecs-env-provisioning-role-construct'
import { ECSOperationsConstruct } from "./constructs/ecs-env-operations-role-construct";
import {
  getAccountId, 
  getRegion, 
  getPrefix, 
  getEnvironmentName, 
  getPlatformRoleArn,
  getPipelineRoleArn,
  getVpcCIDR,
  getExistingVpcId,
} from "./ecs-input";

export interface OPAECSEnvStackProps extends cdk.StackProps {
  uniqueEnvIdentifier: string;
}

export class OPAECSEnvStack extends cdk.Stack {

  constructor(scope: Construct, id: string, props: OPAECSEnvStackProps) {
    super(scope, id, props);

    const prefix = getPrefix().toLowerCase();
    const envName = getEnvironmentName().toLowerCase();
    const awsAccount = getAccountId();
    const platformRoleArn = getPlatformRoleArn();
    const pipelineRoleArn = getPipelineRoleArn();
    const awsRegion = getRegion();
    const cidrInput = getVpcCIDR();
    const existingVpcId = getExistingVpcId();

    // Creating environment params object

    const opaEnvParams: OPAEnvironmentParams = {
      envName: envName,
      awsRegion: awsRegion,
      awsAccount: awsAccount,
      prefix: prefix
    }

    const envPathIdentifier = `/${envName}`

    // Create encryption key for all data at rest encryption
    const key = new kms.Key(this, `${envName}-key`, {
      alias: `${envName}-key`,
      enableKeyRotation: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pendingWindow: cdk.Duration.days(8),
    });

    // Save KMS key arn in an SSM Parameter
    new ssm.StringParameter(this, `${envName}-key-param`, {
      allowedPattern: ".*",
      description: `The KMS Key for ECS Solution: ${envName} Environment`,
      parameterName: `${envPathIdentifier}/kms-key`,
      stringValue: key.keyArn,
    });

    // Create underlying network construct
    const network = new NetworkConstruct(this, envName, {
      opaEnv: opaEnvParams,
      cidrRange: cidrInput,
      isIsolated: false,
      publicVpcNatGatewayCount: 3,
      vpcAzCount: 3,
      existingVpcId,
    })

    // Create ECS Cluster
    const ecsAppCluster = new EcsClusterConstruct(this, `${envName}-app-runtime`, {
      opaEnv: opaEnvParams,
      vpc: network.vpc,
      isFargateCluster: true,
      encryptionKey: key
    });

    //create audit table
    const auditTableConstruct = new DynamoDBConstruct(this, "audit-table", {
      opaEnv: opaEnvParams,
      tableName: `${envName}-audit`,
      kmsKey: key,
    });

    // Create pipeline provisioning role for the environment
    const provisioningRoleConstruct = new ECSProvisioningConstruct(this, `${opaEnvParams.prefix}-${envName}-provisioning-role`, {
      opaEnv: opaEnvParams,
      KMSkey: key,
      vpcCollection: [network.vpc],
      ecsCollection: [ecsAppCluster.cluster],
      assumedBy: pipelineRoleArn,
      auditTable: auditTableConstruct.table.tableName
    });

    // Create operations role for the environment
    const operationsRoleConstruct = new ECSOperationsConstruct(this, `${opaEnvParams.prefix}-${envName}-operations-role`, {
      opaEnv: opaEnvParams,
      KMSkey: key,
      vpcCollection: [network.vpc],
      ecsCollection: [ecsAppCluster.cluster],
      assumedBy: platformRoleArn,
      auditTable: auditTableConstruct.table.tableName
    });

    // save the unique environment identifier
    const uniqueEnvId = new ssm.StringParameter(this, `${envName}-unique-id-param`, {
      allowedPattern: ".*",
      description: `The Unique ID for: ${opaEnvParams.envName} Environment`,
      parameterName: `${envPathIdentifier}/unique-id`,
      stringValue: props.uniqueEnvIdentifier,
    });

    // Printing outputs
    new cdk.CfnOutput(this, "EnvironmentName", {
      value: envName,
    });

    // Printing the unique environment ID
    new cdk.CfnOutput(this, "EnvironmentID", {
      value: uniqueEnvId.stringValue,
    });

    // Printing the unique environment ID
    new cdk.CfnOutput(this, "VPC", {
      value: network.vpcParam.parameterName,
    });

    // Printing the ECS Cluster name
    new cdk.CfnOutput(this, "ClusterName", {
      value: ecsAppCluster.clusterParam.parameterName,
    });

    // Printing audit table
    new cdk.CfnOutput(this, "AuditTable", {
      value: auditTableConstruct.tableParam.parameterName,
    });

    // Print role information
    new cdk.CfnOutput(this, "ProvisioningRole", {
      value: provisioningRoleConstruct.provisioningRoleParam.parameterName,
    });

    new cdk.CfnOutput(this, "ProvisioningRoleARN", {
      value: provisioningRoleConstruct.provisioningRoleArnParam.parameterName,
    });

    new cdk.CfnOutput(this, "OperationsRole", {
      value: operationsRoleConstruct.operationsRoleParam.parameterName,
    });

    new cdk.CfnOutput(this, "OperationsRoleARN", {
      value: operationsRoleConstruct.operationsRoleArnParam.parameterName,
    });

    // print the stack name as a Cloudformation output
    new cdk.CfnOutput(this, `StackName`, {
      value: this.stackName,
      description: "The ECS CF Stack name",
    });
  }
}

