// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as kms from "aws-cdk-lib/aws-kms";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as iam from "aws-cdk-lib/aws-iam";
import { OPAEKSClusterConstruct } from "./constructs/eks-env-cluster-construct";
import { EKSControlPlaneRoleConstruct } from "./constructs/eks-env-control-plane-role-construct";
import { EKSOperationsConstruct } from "./constructs/eks-env-operations-role-construct";
import { EKSProvisioningConstruct } from "./constructs/eks-env-provisioning-role-construct";
import { EKSKubectlLambdaRoleConstruct } from "./constructs/eks-env-kubectl-lambda-role-construct";
import { EKSClusterAdminRoleConstruct } from "./constructs/eks-env-cluster-admin-role-construct"
import { EKSPodExecutionRoleConstruct } from "./constructs/eks-env-pod-execution-role-construct";
import { NetworkConstruct, DynamoDBConstruct, OPAEnvironmentParams } from "@aws/aws-app-development-common-constructs";
import {
  getAccountId,
  getApiAllowList,
  getClusterAdminRoleArn,
  getEnvironmentName,
  getExistingClusterName,
  getExistingKubectlLambdaArn,
  getExistingKubectlLambdaExecutionRoleArn,
  getExistingVpcId,
  getIsPrivateCluster,
  getNodeType,
  NODE_TYPE,
  getPipelineRoleArn,
  getPlatformRoleArn,
  getPrefix,
  getRegion,
  getVpcCIDR,
} from "./eks-input";

export interface OPAEKSEnvStackProps extends cdk.StackProps {
  uniqueEnvIdentifier: string;
}

export class OPAEKSEnvStack extends cdk.Stack {

  constructor(scope: Construct, id: string, props: OPAEKSEnvStackProps) {
    super(scope, id, props);

    const awsAccount = getAccountId();
    const awsRegion = getRegion();
    const envName = getEnvironmentName().toLowerCase();
    const prefix = getPrefix().toLowerCase();
    const isPrivateCluster = getIsPrivateCluster();
    const apiAllowList = getApiAllowList();

    const opaEnvParams: OPAEnvironmentParams = {
      envName: envName,
      awsRegion: awsRegion,
      awsAccount: awsAccount,
      prefix: prefix
    }

    const envIdentifier = `${opaEnvParams.prefix}-${opaEnvParams.envName}`;
    const envPathIdentifier = `/${opaEnvParams.prefix}/${opaEnvParams.envName}`;
    const cidrInput = getVpcCIDR();
    const existingVpcId = getExistingVpcId();
    const platformRoleArn = getPlatformRoleArn();
    const pipelineRoleArn = getPipelineRoleArn();
    const clusterAdminRoleArn = getClusterAdminRoleArn();
    const clusterName = `${envIdentifier}-cluster`;

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
      description: `The KMS Key for EKS Solution: ${envName} Environment`,
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
    });

    // create audit table
    const auditTableConstruct = new DynamoDBConstruct(this, "audit-table", {
      opaEnv: opaEnvParams,
      tableName: `${envName}-audit`,
      kmsKey: key,
    });

    // Create pipeline provisioning role for the environment
    // Also used by EKS Cluster construct - added to the system:masters Kubernetes RBAC group.
    const provisioningRole = new EKSProvisioningConstruct(
      this,
      `${opaEnvParams.prefix}-${envName}-provisioning-role`,
      {
        opaEnv: opaEnvParams,
        vpcCollection: [network.vpc],
        KMSkey: key,
        assumedBy: pipelineRoleArn,
        auditTable: auditTableConstruct.table.tableName,
        existingKubectlLambdaArn: getExistingKubectlLambdaArn(),
      }
    );

    // Create operations role for the environment
    const operationsRole = new EKSOperationsConstruct(
      this,
      `${opaEnvParams.prefix}-${envName}-operations-role`,
      {
        opaEnv: opaEnvParams,
        vpcCollection: [network.vpc],
        KMSkey: key,
        assumedBy: platformRoleArn,
        auditTable: auditTableConstruct.table.tableName,
        existingKubectlLambdaArn: getExistingKubectlLambdaArn(),
        cfnOutputScope: this,
      }
    );

    // Create or lookup kubectl lambda execution role
    const kubectlLambdaRole = new EKSKubectlLambdaRoleConstruct(
      this,
      `${opaEnvParams.prefix}-${envName}-kubectl-lambda-role`,
      {
        opaEnv: opaEnvParams,
        eksClusterName: clusterName,
        cfnOutputScope: this,
        existingLambdaExecutionRoleArn: getExistingKubectlLambdaExecutionRoleArn()
      }
    );

    let podExecutionRole;
    if (getNodeType() === NODE_TYPE.FARGATE && !getExistingClusterName()) {
      // Create pod execution role
      // Only needed for Fargate
      podExecutionRole = new EKSPodExecutionRoleConstruct(
        this,
        `${opaEnvParams.prefix}-${envName}-pod-execution-role`,
        {
          opaEnv: opaEnvParams,
          clusterName,
          cfnOutputScope: this,
        }
      );
    }

    let clusterControlPlaneRole;
    if (!getExistingClusterName()) {
      // creating cluster control plane role and casting type
      // Role that provides permissions for the Kubernetes control plane to make calls to AWS API operations on your behalf.
      clusterControlPlaneRole = new EKSControlPlaneRoleConstruct(this, `${opaEnvParams.prefix}-${envName}-cluster-control-plane-role`, {
        opaEnv: opaEnvParams,
        cfnOutputScope: this,
      });
    }

    // Create a new cluster admin IAM role if an existing IAM role was not provided by the user
    // This IAM role will be mapped to the k8s "cluster-admin" ClusterRole
    let clusterAdminRole;
    if (clusterAdminRoleArn) {
      clusterAdminRole = iam.Role.fromRoleArn(this, 'role,', clusterAdminRoleArn);
    } else {
      clusterAdminRole = new EKSClusterAdminRoleConstruct(this,
        `${envIdentifier}-cluster-admin-role`,
        {
          opaEnv: opaEnvParams,
          kmsKey: key,
          eksClusterName: clusterName,
          cfnOutputScope: this,
        }
      ).iamRole;
    }

    // now save the cluster admin role ARN in SSM Param
    const clusterAdminRoleNameParam = new ssm.StringParameter(this, `${envIdentifier}-cluster-admin-role-param`, {
      allowedPattern: ".*",
      description: `The IAM role name mapped to the K8s cluster-admin ClusterRole for the ${envIdentifier} Environment`,
      parameterName: `${envPathIdentifier}/cluster-admin-role`,
      stringValue: clusterAdminRole.roleName,
    });

    const clusterAdminRoleArnParam = new ssm.StringParameter(this, `${envIdentifier}-cluster-admin-role-arn-param`, {
      allowedPattern: ".*",
      description: `The IAM role ARN mapped to the K8s cluster-admin ClusterRole for the ${envIdentifier} Environment`,
      parameterName: `${envPathIdentifier}/cluster-admin-role-arn`,
      stringValue: clusterAdminRole.roleArn,
    });

    // Deploying EKS Cluster, using pipeline role as the system:masters role for the cluster
    const eksCluster = new OPAEKSClusterConstruct(this, clusterName, {
      privateCluster: isPrivateCluster,
      apiAllowList,
      opaEnv: opaEnvParams,
      clusterMasterRole: provisioningRole.IAMRole,
      controlPlaneRole: clusterControlPlaneRole?.IAMRole,
      vpc: network.vpc,
      clusterAdminRole,
      lambdaExecutionRole: kubectlLambdaRole.iamRole,
      podExecutionRole: podExecutionRole?.IAMRole,
      cfnOutputScope: this
    });

    // Printing the environment name that was just created
    new cdk.CfnOutput(this, "EnvironmentName", {
      value: envName,
    });

    // save the unique environment identifier
    const uniqueEnvId = new ssm.StringParameter(this, `${envName}-unique-id-param`, {
      allowedPattern: ".*",
      description: `The Unique ID for: ${opaEnvParams.envName} Environment`,
      parameterName: `${envPathIdentifier}/unique-id`,
      stringValue: props.uniqueEnvIdentifier,
    });

    // Printing the unique environment ID
    new cdk.CfnOutput(this, "EnvironmentID", {
      value: uniqueEnvId.parameterName,
    });
    // Printing the unique VPC ID
    new cdk.CfnOutput(this, "VPC", {
      value: network.vpcParam.parameterName,
    });

    // Printing the EKS Cluster name
    new cdk.CfnOutput(this, "ClusterName", {
      value: eksCluster.clusterParameter.parameterName  //eksAppCluster.clusterParam.parameterName,
    });

    // Printing audit table
    new cdk.CfnOutput(this, "AuditTable", {
      value: auditTableConstruct.tableParam.parameterName,
    });

    new cdk.CfnOutput(this, "OperationsRoleARN", {
      value: operationsRole.operationsRoleArnParam.parameterName,
      description: "SSM param key storing the role assumed by pipeline role to operate the cluster",
    });

    new cdk.CfnOutput(this, "ProvisioningRoleARN", {
      value: provisioningRole.provisioningRoleArnParam.parameterName,
      description: "SSM param key storing the role that is used to provision the cluster and is used as the cluster master role",
    });

    new cdk.CfnOutput(this, "ProvisioningRoleDirectARN", {
      value: provisioningRole.IAMRole.roleArn,
      description: "This role is used to provision the cluster and is used as the cluster master role",
    });

    new cdk.CfnOutput(this, "KubectlLambdaRoleDirectARN", {
      value: kubectlLambdaRole.iamRole.roleArn,
      description: "This role is used as the kubectl lambda execution role",
    });

    new cdk.CfnOutput(this, "KubectlLambdaRoleARN", {
      value: kubectlLambdaRole.kubectlLambdaRoleArnParam.parameterName,
      description: "SSM param key storing the role used as the kubectl lambda execution role",
    });

    new cdk.CfnOutput(this, "ClusterAdminRoleARN", {
      value: clusterAdminRoleArnParam.parameterName,
      description: "SSM param key storing the IAM role mapped to the K8s cluster-admin ClusterRole",
    });

    new cdk.CfnOutput(this, "ClusterAdminRoleDirectARN", {
      value: clusterAdminRole.roleArn,
      description: "The IAM role mapped to the K8s cluster-admin ClusterRole",
    });

    // print the stack name as a Cloudformation output
    new cdk.CfnOutput(this, `StackName`, {
      value: this.stackName,
      description: "The EKS CF Stack name",
    });
  }
}
