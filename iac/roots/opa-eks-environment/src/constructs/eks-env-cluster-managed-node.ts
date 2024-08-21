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
  isInstallAwsLoadBalancerController,
} from "../eks-input";

// This class creates an EKS Cluster with a Managed Node Group

export interface OPAEKSManagedNodeClusterConstructProps extends cdk.StackProps {
  readonly opaEnv: OPAEnvironmentParams;

  /**
   * An IAM role that will be added to the system:masters Kubernetes RBAC group.
   * This role is Highly privileged and can only be accesed in cloudtrail through the CreateCluster api
   * upon cluster creation
   */
  clusterMasterRole?: iam.IRole
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
   * Optional - IAM role assigned to cluster nodes. Will be generated if not supplied
   */
  nodeGroupRole?: iam.IRole | undefined

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
      albController: isInstallAwsLoadBalancerController() ? {
        version: props.albControllerVersion,
      } : undefined,
    });
    this.cluster = cluster;

    const launchTemplate = new ec2.CfnLaunchTemplate(this, `${envIdentifier}-launch-template`, {
      launchTemplateData: {
        instanceType: getInstanceType(),
        blockDeviceMappings: [
          {
            deviceName: '/dev/xvda',
            ebs: {
              encrypted: true,
              volumeType: 'gp3',
              volumeSize: getNodeGroupDiskSize()
            },
          },
        ],
        metadataOptions: {
          httpTokens: 'required', // IMDSv2 is required
          // As per https://docs.aws.amazon.com/eks/latest/userguide/launch-templates.html#launch-template-basics,
          // If any containers that you deploy to the node group use the Instance Metadata Service Version 2, make sure to set the Metadata response hop limit to 2
          httpPutResponseHopLimit: 2,
        },
      },
    });

    cluster.addNodegroupCapacity('custom-node-group', {
      minSize: getNodeGroupMinSize(),
      desiredSize: getNodeGroupDesiredSize(),
      maxSize: getNodeGroupMaxSize(),
      amiType: eks.NodegroupAmiType[getAmiType() as keyof typeof eks.NodegroupAmiType],
      nodeRole: props.nodeGroupRole,
      launchTemplateSpec: {
        id: launchTemplate.ref,
        version: launchTemplate.attrLatestVersionNumber,
      },
    });

    new OPAEKSManagedNodeClusterFluentBitConstruct(this, `${envIdentifier}-fluent-bit-config`, {
      opaEnv: props.opaEnv,
      clusterName: props.clusterName,
      cluster,
      cfnOutputScope: props.cfnOutputScope
    });

  }

}
