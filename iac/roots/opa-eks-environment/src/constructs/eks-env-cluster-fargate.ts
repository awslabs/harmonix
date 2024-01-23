// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as kms from "aws-cdk-lib/aws-kms"
import * as eks from "aws-cdk-lib/aws-eks";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { OPAEnvironmentParams } from "@aws/aws-app-development-common-constructs";
import { OPAEKSFargateClusterFluentBitConstruct } from "./eks-env-fargate-fluent-bit-config-construct";

// This class creates an EKS Cluster that uses Fargate

export interface OPAEKSFargateClusterConstructProps extends cdk.StackProps {
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
   * IAM role to assign as pod execution role in the Fargate Profile
   */
  podExecutionRole: iam.IRole

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

// FargateClusterProps has bug in cdk lib 2.118 where it is not exposing a kubectlLambdaRole property
interface ExtFargateClusterProps extends cdk.aws_eks.FargateClusterProps { kubectlLambdaRole?: cdk.aws_iam.IRole | undefined }

export class OPAEKSFargateClusterConstruct extends Construct {
  public readonly cluster: eks.Cluster

  constructor(parent: Construct, name: string, props: OPAEKSFargateClusterConstructProps) {
    super(parent, name);

    const envIdentifier = `${props.opaEnv.prefix.toLowerCase()}-${props.opaEnv.envName}`;

    const cluster = new eks.FargateCluster(this, `${envIdentifier}-app-runtime`, {
      version: props.kubernetesVersion,
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

      defaultProfile: {
        selectors: [
          { namespace: 'kube-system' },
          { namespace: 'default' },
          { namespace: '*' }
        ],
        podExecutionRole: props.podExecutionRole
      },

      /*
      * Controls the "eks.amazonaws.com/compute-type" annotation in the CoreDNS configuration 
      * on your cluster to determine which compute type to use for CoreDNS.
      */
      coreDnsComputeType: eks.CoreDnsComputeType.FARGATE
    } as ExtFargateClusterProps);
    this.cluster = cluster;

    new OPAEKSFargateClusterFluentBitConstruct(this, `${envIdentifier}-fluent-bit-config`, {
      opaEnv: props.opaEnv,
      cluster,
    });

  }

}
