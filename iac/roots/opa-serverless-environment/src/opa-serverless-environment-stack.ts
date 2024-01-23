// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as kms from "aws-cdk-lib/aws-kms";
import { Construct } from "constructs";
import { NetworkConstruct, OPAEnvironmentParams, DynamoDBConstruct, } from '@aws/aws-app-development-common-constructs'
import { ServerlessAPIProvisioningConstruct } from './constructs/serverless-api-env-provisioning-role-construct'
import { ServerlessAPIOperationsConstruct } from "./constructs/serverless-api-env-operations-role-construct";
import {
  getAccountId, 
  getRegion, 
  getPrefix, 
  getEnvironmentName, 
  getPlatformRoleArn,
  getPipelineRoleArn,
  getVpcCIDR,
  getExistingVpcId,
} from "./serverless-input";

export interface OPAServerlessEnvStackProps extends cdk.StackProps {
  uniqueEnvIdentifier: string;
}

export class OPAServerlessEnvStack extends cdk.Stack {

  constructor(scope: Construct, id: string, props: OPAServerlessEnvStackProps) {
    super(scope, id, props);

    const prefix = getPrefix();
    const envName = getEnvironmentName();
    const awsAccount = getAccountId();
    const platformRoleArn = getPlatformRoleArn();
    const pipelineRoleArn = getPipelineRoleArn();
    const awsRegion = getRegion();
    const cidrInput = getVpcCIDR();
    const existingVpcId = getExistingVpcId();

    // Creating environment params object

    const opaEnvParams: OPAEnvironmentParams = {
      envName: envName.toLowerCase(),
      awsRegion: awsRegion,
      awsAccount: awsAccount,
      prefix: prefix.toLowerCase()
    }

    const envIdentifier = opaEnvParams.envName;
    const envPathIdentifier = `/${envIdentifier}`

    // Create encryption key for all data at rest encryption
    const key = new kms.Key(this, `${envIdentifier}-key`, {
      alias: `${envIdentifier}-key`,
      enableKeyRotation: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pendingWindow: cdk.Duration.days(8),
    });

    // Save KMS key arn in an SSM Parameter
    new ssm.StringParameter(this, `${envIdentifier}-key-param`, {
      allowedPattern: ".*",
      description: `The KMS Key for Serverless API Solution: ${envIdentifier} Environment`,
      parameterName: `${envPathIdentifier}/kms-key`,
      stringValue: key.keyArn,
    });

    // Create underlying network construct
    const network = new NetworkConstruct(this, envIdentifier, {
      opaEnv: opaEnvParams,
      cidrRange: cidrInput,
      isIsolated: false,
      publicVpcNatGatewayCount: 3,
      vpcAzCount: 3,
      existingVpcId,
    })

    //create audit table
    const auditTableConstruct = new DynamoDBConstruct(this, "audit-table", {
      opaEnv: opaEnvParams,
      tableName: `${envIdentifier}-audit`,
      kmsKey: key,
    });

    // Create pipeline provisioning role for the environment
    const provisioningRoleConstruct = new ServerlessAPIProvisioningConstruct(this, `${opaEnvParams.prefix}-${envIdentifier}-provisioning-role`, {
      opaEnv: opaEnvParams,
      KMSkey: key,
      vpcCollection: [network.vpc],
      assumedBy: pipelineRoleArn,
      auditTable: auditTableConstruct.table.tableName,
    });

    // Create operations role for the environment
    const operationsRoleConstruct = new ServerlessAPIOperationsConstruct(this, `${opaEnvParams.prefix}-${envIdentifier}-operations-role`, {
      opaEnv: opaEnvParams,
      KMSkey: key,
      vpcCollection: [network.vpc],
      assumedBy: platformRoleArn,
      auditTable: auditTableConstruct.table.tableName
    });

    // save the unique environment identifier
    const uniqueEnvId = new ssm.StringParameter(this, `${envIdentifier}-unique-id-param`, {
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
      description: "The Serverless API Environment Provider CF Stack name",
    });
  }
}
