// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as kms from "aws-cdk-lib/aws-kms"
import * as eks from "aws-cdk-lib/aws-eks";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { KubectlV28Layer } from '@aws-cdk/lambda-layer-kubectl-v28';
import { OPAEnvironmentParams } from "@aws/aws-app-development-common-constructs";
import {
  getCreateK8sOpaResources,
  getExistingClusterName,
  getExistingKubectlOnEventLambdaArn,
  getNodeType,
  NODE_TYPE,
} from "../eks-input";
import { OPAEKSManagedNodeClusterConstruct } from "./eks-env-cluster-managed-node";
import { OPAEKSFargateClusterConstruct } from "./eks-env-cluster-fargate";
import { KubectlProvider } from "aws-cdk-lib/aws-eks";

// This class creates an EKS Cluster that uses either Fargate or a Managed Node Group,
// depending on the user selection during provider scaffolding

export interface OPAEKSClusterConstructProps extends cdk.StackProps {
  readonly opaEnv: OPAEnvironmentParams;
  /**
   * make cluster public or private
   */
  privateCluster: boolean;
  /**
   * IP CIDR block allow-list if the EKS API Server Endpoint allows public access
   */
  apiAllowList: string[] | undefined;
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
  controlPlaneRole: iam.Role | undefined
  /**
   * VPC where the cluster should reside
   */
  vpc: ec2.IVpc
  /**
   * IAM role to set in the aws-auth ConfigMap as a cluster-admin
   */
  clusterAdminRole: iam.IRole
  /**
   * IAM role to assign as pod execution role in the Fargate Profile
   */
  podExecutionRole: iam.IRole | undefined

  /**
   * IAM role to assign as the kubectl lambda's execution role
   */
  lambdaExecutionRole: iam.IRole

  /**
   * Scope for CfnOutput
   */
  cfnOutputScope: any
}

export class OPAEKSClusterConstruct extends Construct {
  public readonly clusterParameter: ssm.StringParameter;
  public readonly cluster: eks.Cluster;

  constructor(parent: Construct, name: string, props: OPAEKSClusterConstructProps) {
    super(parent, name);

    const envIdentifier = `${props.opaEnv.prefix.toLowerCase()}-${props.opaEnv.envName}`;
    const envPathIdentifier = `/${props.opaEnv.prefix.toLowerCase()}/${props.opaEnv.envName.toLowerCase()}`;

    // define if the cluster will be public or private
    let endpointAccess = props.privateCluster ? eks.EndpointAccess.PRIVATE : eks.EndpointAccess.PUBLIC_AND_PRIVATE;
    if (!props.privateCluster && props.apiAllowList && props.apiAllowList.length) {
      endpointAccess = endpointAccess.onlyFrom(...props.apiAllowList);
    }

    if (getExistingClusterName()) {
      console.log("...Importing Existing EKS Cluster");
    } else {
      console.log("...Creating EKS Cluster");
    }

    const clusterName = `${envIdentifier}-cluster`;
    const clusterLogging = [
      eks.ClusterLoggingTypes.API,
      eks.ClusterLoggingTypes.AUTHENTICATOR,
      eks.ClusterLoggingTypes.SCHEDULER,
    ];
    const kubectlLayer = new KubectlV28Layer(this, 'kubectl');
    const albControllerVersion = eks.AlbControllerVersion.V2_6_2;
    const kubernetesVersion = eks.KubernetesVersion.V1_28;

    const clusterAdminK8sUsername = props.clusterAdminRole.roleArn;

    // These configs could be used if you only want to grant access to a specific user who has assumed
    // the clusterAdmin role. It translates from the cluster admin role ARN to an equivalent "assumed-role" ARN
    // const clusterAdminRoleParts = cdk.Fn.split(":", props.clusterAdminRole.roleArn);
    // const clusterAdminRoleAccount = cdk.Fn.select(4, clusterAdminRoleParts);
    // const clusterAdminRoleName = cdk.Fn.select(1, cdk.Fn.split("/", cdk.Fn.select(5, clusterAdminRoleParts)));
    // const clusterAdminK8sUsername = cdk.Fn.join('',
    //   [
    //     "arn:aws:sts::",
    //     clusterAdminRoleAccount,
    //     ":assumed-role/",
    //     clusterAdminRoleName,
    //     "/{{SessionName}}"
    //   ]);

    let clusterConstruct;

    const isCreateNewCluster = !getExistingClusterName();

    if (isCreateNewCluster) {

      // define KMS key for secrets encryption
      const clusterKmsKey = new kms.Key(this, `${envIdentifier}-cluster-key`, {
        enableKeyRotation: true,
        alias: cdk.Fn.join('', ['alias/', 'eks/', `${envIdentifier}-cluster-key-alias`]),
      });

      if (getNodeType() === NODE_TYPE.MANAGED) {
        clusterConstruct = new OPAEKSManagedNodeClusterConstruct(this, `${envIdentifier}-app-runtime`, {
          cfnOutputScope: props.cfnOutputScope,
          opaEnv: props.opaEnv,
          clusterMasterRole: props.clusterMasterRole,
          controlPlaneRole: props.controlPlaneRole!,
          vpc: props.vpc,
          endpointAccess,
          clusterName,
          clusterLogging,
          kubectlLayer,
          kubernetesVersion,
          albControllerVersion,
          clusterKmsKey,
          lambdaExecutionRole: props.lambdaExecutionRole,
        });
      } else {
        clusterConstruct = new OPAEKSFargateClusterConstruct(this, `${envIdentifier}-app-runtime`, {
          podExecutionRole: props.podExecutionRole!,
          cfnOutputScope: props.cfnOutputScope,
          opaEnv: props.opaEnv,
          clusterMasterRole: props.clusterMasterRole,
          controlPlaneRole: props.controlPlaneRole!,
          vpc: props.vpc,
          endpointAccess,
          clusterName,
          clusterLogging,
          kubectlLayer,
          kubernetesVersion,
          albControllerVersion,
          clusterKmsKey,
          lambdaExecutionRole: props.lambdaExecutionRole,
        });
      }

    } else {

      const clusterAttributes: eks.ClusterAttributes = {
        clusterName: getExistingClusterName(),
        vpc: props.vpc,
        kubectlRoleArn: props.clusterAdminRole.roleArn,
        kubectlLambdaRole: props.lambdaExecutionRole,
        kubectlLayer,
      };

      if (getExistingKubectlOnEventLambdaArn()) {
        const kubectlProvider = eks.KubectlProvider.fromKubectlProviderAttributes(this, 'KubectlProvider', {
          functionArn: getExistingKubectlOnEventLambdaArn(),
          kubectlRoleArn: props.clusterAdminRole.roleArn,
          handlerRole: props.lambdaExecutionRole,
        });
        (clusterAttributes as any).kubectlProvider = kubectlProvider;
      }

      const existingCluster = eks.Cluster.fromClusterAttributes(this, "EKS", clusterAttributes);
      if (!existingCluster) {
        throw new Error(`Failed to get EKS cluster with name ${clusterName} in vpc ${props.vpc}`);
      }
      clusterConstruct = {
        cluster: (existingCluster as eks.Cluster)
      };

    }

    const cluster = clusterConstruct.cluster;

    if (getCreateK8sOpaResources()) {

      // Create a ClusterRoleBinding for the cluster admin IAM role
      const clusterAdminClusterRoleBinding = cluster.addManifest(`cluster-admin-role-binding`, {
        apiVersion: 'rbac.authorization.k8s.io/v1',
        kind: 'ClusterRoleBinding',
        metadata: { name: 'opa-cluster-admin' },
        subjects: [
          {
            kind: 'User',
            name: clusterAdminK8sUsername,
            apiGroup: 'rbac.authorization.k8s.io'
          }
        ],
        roleRef: {
          kind: 'ClusterRole',
          name: 'cluster-admin',
          apiGroup: 'rbac.authorization.k8s.io'
        }
      });

      // Create a ClusterRole that allows for viewing namespaces
      const clusterNamespaceViewerRole = cluster.addManifest(`cluster-ns-viewer-role`, {
        apiVersion: 'rbac.authorization.k8s.io/v1',
        kind: 'ClusterRole',
        metadata: { name: 'opa-namespace-viewer' },
        rules: [
          {
            apiGroups: [''],
            resources: ['namespaces'],
            verbs: ['get', 'list', 'watch'],
          }
        ],
      });
    }

    if (isCreateNewCluster) {

      // Get a reference to the aws-auth ConfigMap created by eks.FargateCluster or eks.Cluster construct
      const awsAuth = cluster.awsAuth;

      // Add the cluster admin IAM role to the aws-auth ConfigMap so that it can be used with kubectl
      // Note - the environment provider provisioning role already has cluster access since it is set in the systems:master group
      awsAuth.addRoleMapping(props.clusterAdminRole, { username: clusterAdminK8sUsername, groups: [] });

    } else if (!getExistingKubectlOnEventLambdaArn() && !getCreateK8sOpaResources()) {

      // OPA requires the KubeCtl Provider, which is typically a lambda function
      // that can execute kubectl commands, even when the Kubernetes API server
      // only allows private access. We only want to create this if it wasn't already created.
      KubectlProvider.getOrCreate(this, cluster);
    }

    const clusterParam = new ssm.StringParameter(this, `${name}-eks-cluster-param`, {
      allowedPattern: ".*",
      description: `The EKS Cluster for OPA Solution: ${props.opaEnv.envName} Environment`,
      parameterName: `${envPathIdentifier}/eks-cluster`,
      stringValue: cluster.clusterArn
    });
    this.clusterParameter = clusterParam;
  }

}
