// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import ec2 from "aws-cdk-lib/aws-ec2";
import ecs from "aws-cdk-lib/aws-ecs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";
import { bool } from "aws-sdk/clients/signer";
import { Construct } from "constructs";
import { BackstageInfraConfig } from "../helpers/infra-config";

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface RoleConstructProps extends cdk.StackProps {
  readonly config: BackstageInfraConfig;
  KMSkey: kms.IKey;
  isAdmin: bool;
  isRoot: bool;
  vpcCollection: ec2.Vpc[];
  ecsCollection: ecs.ICluster[];
  rootRole?: iam.Role;
}

const defaultProps: Partial<RoleConstructProps> = {};

export class RoleConstruct extends Construct {
  public IAMRole: iam.Role;

  constructor(parent: Construct, name: string, props: RoleConstructProps) {
    super(parent, name);

    /* eslint-disable @typescript-eslint/no-unused-vars */
    props = { ...defaultProps, ...props };

    this.IAMRole = new iam.Role(this, name, {
      // allow the role to be assumed by other roles
      assumedBy: !props.isRoot
        ? new iam.CompositePrincipal(
            new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
            // new iam.ArnPrincipal(`arn:aws:iam::${props.config.Account}:role/${props.rootRole}`)
            new iam.ArnPrincipal(props.rootRole ? props.rootRole.roleArn : "")
          )
        : new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      roleName: name,
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEC2ContainerRegistryFullAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("CloudWatchFullAccess"),
      ],
      maxSessionDuration: cdk.Duration.seconds(43200),
    });

    this.IAMRole.addToPolicy(
      new iam.PolicyStatement({
          actions: [
          "secretsmanager:CreateSecret",
          "secretsmanager:GetSecretValue",
          "secretsmanager:PutSecretValue",
          "secretsmanager:UpdateSecret",
          "secretsmanager:TagResource",
          ],
        effect: iam.Effect.ALLOW,
        resources: [`arn:aws:secretsmanager:*:${props.config.Account}:secret:*`],
      })
    );

    this.IAMRole.addToPolicy(
      new iam.PolicyStatement({
          actions: [
          "s3:CreateBucket",
          "s3:PutBucketTagging"
          ],
        effect: iam.Effect.ALLOW,
        resources: ["*"],
        conditions:{
          "StringEquals": {
            "aws:ResourceAccount": props.config.Account
        }}
      })
    );

    this.IAMRole.addToPolicy(
      new iam.PolicyStatement({
          actions: [
          "s3:GetObject",
          "s3:GetObjectAttributes"
          ],
        effect: iam.Effect.ALLOW,
        resources: ["arn:aws:s3:::*/packaged.yaml"],
        conditions:{
          "StringEquals": {
            "aws:ResourceAccount": props.config.Account
        }}
      })
    );

    this.IAMRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["resource-groups:ListGroupResources"],
        effect: iam.Effect.ALLOW,
        resources: [`arn:aws:resource-groups:*:${props.config.Account}:group/*`],
      })
    );

    this.IAMRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "cloudformation:DescribeStacks",
          "cloudformation:ListStackResources"
        ],
        effect: iam.Effect.ALLOW,
        resources: [`arn:aws:cloudformation:*:${props.config.Account}:stack/baws-api-*`],
      })
    );

    this.IAMRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["tag:GetResources"],
        effect: iam.Effect.ALLOW,
        resources: ["*"],
      })
    );

    this.IAMRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "dynamodb:Scan",
          "dynamodb:PutItem",
          ],
        effect: iam.Effect.ALLOW,
        resources: [`arn:aws:dynamodb:*:${props.config.Account}:table/*`],
      })
    );

    this.IAMRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["kms:Decrypt"],
        effect: iam.Effect.ALLOW,
        resources: [props.KMSkey.keyArn],
      })
    );
    this.IAMRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMReadOnlyAccess"));
    // this.IAMRole.grantAssumeRole(new iam.ArnPrincipal(`arn:aws:iam::${props.config.Account}:role/backstage*`))

    this.IAMRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["states:*"],
        effect: iam.Effect.ALLOW,
        resources: [`arn:aws:states:*:${props.config.Account}:*`],
      })
    );

    if (props.isAdmin) {
      this.IAMRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonECS_FullAccess")); // to start/stop all ecs tasks
      this.IAMRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonVPCFullAccess")); // to maniuplate network for all vpcs
      this.IAMRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEC2FullAccess")); // to start/stop ec2 machinces in all envinronments
    } else {
      for (const vpc of props.vpcCollection) {
        this.IAMRole.addToPolicy(
          new iam.PolicyStatement({
            actions: ["ec2:*"],
            effect: iam.Effect.ALLOW,
            resources: [`arn:aws:ec2:*:${props.config.Account}:vpc/${vpc.vpcId}`],
          })
        );
      }

      for (const ecs of props.ecsCollection) {
        this.IAMRole.addToPolicy(
          new iam.PolicyStatement({
            actions: ["ecs:*"],
            effect: iam.Effect.ALLOW,
            // resources: [ecs.clusterArn, ecs.clusterArn + "/*"],
            resources: ["*"], // Fix for ecs cluster restriction doc https://docs.aws.amazon.com/AmazonECS/latest/userguide/security_iam_id-based-policy-examples.html
            conditions:{
              "ArnEquals": {
                "ecs:cluster": ecs.clusterArn
            }}
          })
        );

        this.IAMRole.addToPolicy(
          new iam.PolicyStatement({
            actions: ["ecs:DescribeTaskDefinition", "ecs:RegisterTaskDefinition"],
            effect: iam.Effect.ALLOW,
            // resources: [ecs.clusterArn, ecs.clusterArn + "/*"],
            resources: ["*"], // Fix for ecs cluster restriction doc https://docs.aws.amazon.com/AmazonECS/latest/userguide/security_iam_id-based-policy-examples.html
          })
        );
      }  //end of for ecs cluster loop
      
      this.IAMRole.addToPolicy(
        new iam.PolicyStatement({
          actions: ["iam:PassRole"],
          effect: iam.Effect.ALLOW,
          resources: ["*"],
          conditions: {
            "StringLike": {
                "iam:PassedToService": "ecs-tasks.amazonaws.com"
            }
          }
          
        })
      );

    }

    if (props.isRoot) {
      //Allow master role to assume backstage roles
      this.IAMRole.addToPolicy(
        new iam.PolicyStatement({
          actions: ["sts:AssumeRole"],
          effect: iam.Effect.ALLOW,
          resources: [`arn:aws:iam::${props.config.Account}:role/backstage*`],
        })
      );

      // Read only access to master role
      this.IAMRole.addToPolicy(
        new iam.PolicyStatement({
          actions: [
            "dynamodb:List*",
            "dynamodb:DescribeStream",
            "dynamodb:DescribeTable",
            "dynamodb:Get*",
            "dynamodb:Query",
            "dynamodb:Scan",
          ],
          effect: iam.Effect.ALLOW,
          resources: [`arn:aws:dynamodb:*:${props.config.Account}:*`],
        })
      );
    }

  }
}
