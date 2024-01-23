// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as kms from "aws-cdk-lib/aws-kms";
import * as sns from "aws-cdk-lib/aws-sns";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as asg from "aws-cdk-lib/aws-autoscaling";
import * as vpc from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import { OPAEnvironmentParams } from "./opa-environment-params";

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface EcsClusterConstructProps extends cdk.StackProps {
  readonly opaEnv: OPAEnvironmentParams;
  /**
   * The VPC to launch the cluster in
   */
  vpc: vpc.IVpc;
  /**
   * Whether to launch a fargate launch-type cluster or EC2 launch-type
   *
   * @default - true to launch a Fargate cluster
   */
  isFargateCluster?: boolean;
  /**
   * The EC2 instance types to use in a EC2 launch-type cluster.
   * This property should not be specified for Fargate clusters.
   *
   * @default - use 'c5.large' instance types
   */
  ec2InstanceType?: vpc.InstanceType;
  containerInsights?: boolean
  /**
   * The desired number of EC2 instances
   * This property should not be specified for Fargate clusters.
   *
   * @default - 0
   */
  ec2MinCapacity?: number;
  /**
   * The maximum number of EC2 instances
   * This property should not be specified for Fargate clusters.
   *
   * @default - 5
   */
  ec2MaxCapacity?: number;
  // TODO: support dynamically determining the appropriate subnet type.
  // The VPC should be inspect to choose a subnet type based on what's available in the vpc
  /**
   * The type of subnet to be used when launching EC2 instances for the cluster.
   *
   * @default - launch into private subnets with egress
   */
  ec2VpcSubnets?: vpc.SubnetSelection;
  /**
   * The KMS encryption key to use for this cluster
   */
  encryptionKey: kms.IKey;
}

const defaultProps: Partial<EcsClusterConstructProps> = {
  isFargateCluster: true,
  ec2InstanceType: new vpc.InstanceType("c5.large"),
  ec2MinCapacity: 0,
  ec2MaxCapacity: 5,
  ec2VpcSubnets: { subnetType: vpc.SubnetType.PRIVATE_WITH_EGRESS },
  containerInsights: true,
};

/**
 * Deploys the EcsClusterConstruct construct.
 * This creates an ECS cluster with reasonable defaults.
 */
export class EcsClusterConstruct extends Construct {
  public readonly cluster: ecs.Cluster;
  public readonly clusterParam: ssm.StringParameter;

  constructor(scope: Construct, id: string, props: EcsClusterConstructProps) {
    super(scope, id);

    /* eslint-disable @typescript-eslint/no-unused-vars */
    props = { ...defaultProps, ...props };

    const envIdentifier = `${props.opaEnv.prefix.toLowerCase()}-${props.opaEnv.envName}`;
    const envPathIdentifier = `/${props.opaEnv.prefix.toLowerCase()}/${props.opaEnv.envName.toLowerCase()}`;

    this.cluster = new ecs.Cluster(this, `${envIdentifier}-cluster`, {
      vpc: props.vpc,
      clusterName: `${envIdentifier}-cluster`,
      enableFargateCapacityProviders: props.isFargateCluster,
      containerInsights: true,
    });

    // Create an SNS Topic to use for scaling notifications
    const scalingTopic = new sns.Topic(this, `${envIdentifier}-clusterScalingTopic`, {
      masterKey: props.encryptionKey,
    });


    // If we're creating an EC2 launch-type cluster, then we will need to add
    // capacity to it
    if (!props.isFargateCluster) {
      // Add customized capacity. Be sure to start the Amazon ECS-optimized AMI.
      const autoScalingGroup = new asg.AutoScalingGroup(this, `${envIdentifier}-cluster-asg`, {
        vpc: props.vpc,
        vpcSubnets: props.ec2VpcSubnets,
        minCapacity: props.ec2MinCapacity,
        maxCapacity: props.ec2MaxCapacity,
        instanceType: props.ec2InstanceType,
        machineImage: ecs.EcsOptimizedImage.amazonLinux2(),
        notifications: [{
          topic: scalingTopic,
          scalingEvents: asg.ScalingEvents.ALL,
        }],
      });

      const capacityProvider = new ecs.AsgCapacityProvider(this, `${envIdentifier}-asgcapacity`, {
        autoScalingGroup,
      });
      this.cluster.addAsgCapacityProvider(capacityProvider);

    }

    const clusterParam = new ssm.StringParameter(this, `${id}-param`, {
      allowedPattern: ".*",
      description: `The ECS Cluster for OPA Solution: ${props.opaEnv.envName} Environment`,
      parameterName: `${envPathIdentifier}/ecs-cluster`,
      stringValue: this.cluster.clusterArn,
    });

    this.clusterParam = clusterParam;

  }
}
