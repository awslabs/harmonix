// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as kms from "aws-cdk-lib/aws-kms"
import * as eks from "aws-cdk-lib/aws-eks";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { OPAEnvironmentParams } from "@aws/aws-app-development-common-constructs";
import { OPAEKSManagedNodeClusterFluentBitConstruct } from "./eks-env-managed-node-fluent-bit-config-construct";
import {
  getAmiType,
  getInstanceType,
  getNodeGroupDesiredSize,
  getNodeGroupDiskSize,
  getNodeGroupMaxSize,
  getNodeGroupMinSize,
} from "../eks-input";

// This class creates an EKS Cluster with a Managed Node Group

export interface OPAEKSManagedNodeClusterConstructProps extends cdk.StackProps {
  readonly opaEnv: OPAEnvironmentParams;

  /**
   * An IAM role that will be added to the system:masters Kubernetes RBAC group.
   * This role is Highly privileged and can only be accesed in cloudtrail through the CreateCluster api
   * upon cluster creation
   */
  clusterMasterRole: iam.Role
  /**
   * Role that provides permissions for the Kubernetes control 
   * plane to make calls to AWS API operations on your behalf.
   */
  controlPlaneRole: iam.Role

  vpc: ec2.IVpc

  /**
   * Scope for CfnOutput
   */
  cfnOutputScope: any

  clusterName: string

  clusterKmsKey: kms.Key

  endpointAccess: cdk.aws_eks.EndpointAccess

  kubernetesVersion: eks.KubernetesVersion

  kubectlLayer: cdk.aws_lambda.ILayerVersion

  albControllerVersion: eks.AlbControllerVersion

  clusterLogging: cdk.aws_eks.ClusterLoggingTypes[] | undefined

  /**
  * IAM role to assign as the kubectl lambda's execution role
  */
  lambdaExecutionRole: iam.IRole
}

export class OPAEKSManagedNodeClusterConstruct extends Construct {
  public readonly cluster: eks.Cluster

  constructor(parent: Construct, name: string, props: OPAEKSManagedNodeClusterConstructProps) {
    super(parent, name);

    const envIdentifier = `${props.opaEnv.prefix.toLowerCase()}-${props.opaEnv.envName}`;

    // See documentation here: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_eks.Cluster.html
    const cluster = new eks.Cluster(this, `${envIdentifier}-app-runtime`, {
      version: props.kubernetesVersion,
      defaultCapacity: 0,
      clusterLogging: props.clusterLogging,
      clusterName: props.clusterName,
      endpointAccess: props.endpointAccess,
      mastersRole: props.clusterMasterRole,
      role: props.controlPlaneRole,
      outputClusterName: true,
      outputConfigCommand: true,
      outputMastersRoleArn: true,
      vpc: props.vpc,
      // Ensure EKS helper lambdas are in private subnets
      placeClusterHandlerInVpc: true,
      secretsEncryptionKey: props.clusterKmsKey,
      // Create a lambda function that can authenticate and make calls with kubectl and helm
      // See https://github.com/cdklabs/awscdk-asset-kubectl#readme
      kubectlLayer: props.kubectlLayer,
      kubectlLambdaRole: props.lambdaExecutionRole,
      albController: {
        version: props.albControllerVersion,
      },
    });
    this.cluster = cluster;

    cluster.addNodegroupCapacity('custom-node-group', {
      instanceTypes: [new ec2.InstanceType(getInstanceType())],
      minSize: getNodeGroupMinSize(),
      desiredSize: getNodeGroupDesiredSize(),
      maxSize: getNodeGroupMaxSize(),
      diskSize: getNodeGroupDiskSize(),
      amiType: eks.NodegroupAmiType[getAmiType() as keyof typeof eks.NodegroupAmiType],
    });

    new OPAEKSManagedNodeClusterFluentBitConstruct(this, `${envIdentifier}-fluent-bit-config`, {
      opaEnv: props.opaEnv,
      clusterName: props.clusterName,
      cluster,
      cfnOutputScope: props.cfnOutputScope
    });

  }

}
