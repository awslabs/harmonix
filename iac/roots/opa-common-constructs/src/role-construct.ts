// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { OPAEnvironmentParams } from "./opa-environment-params";

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface RoleConstructProps extends cdk.StackProps {
  readonly opaEnv: OPAEnvironmentParams;
  KMSkey: kms.IKey;
  vpcCollection: ec2.Vpc[];
  ecsCollection: ecs.ICluster[];
  rootRoleArn?: string;
}

const defaultProps: Partial<RoleConstructProps> = {};

export class RoleConstruct extends Construct {
  public IAMRole: iam.Role;

  constructor(parent: Construct, name: string, props: RoleConstructProps) {
    super(parent, name);

    /* eslint-disable @typescript-eslint/no-unused-vars */
    props = { ...defaultProps, ...props };

    const envIdentifier = `${props.opaEnv.prefix.toLowerCase()}-${props.opaEnv.envName}`;
    const envPathIdentifier = `/${props.opaEnv.prefix.toLowerCase()}/${props.opaEnv.envName.toLowerCase()}`;

    this.IAMRole = new iam.Role(this, `${envIdentifier}-role`, {
      // allow the role to be assumed by other roles
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
        // new iam.ArnPrincipal(`arn:aws:iam::${props.config.Account}:role/${props.rootRole}`)
        new iam.ArnPrincipal(props.rootRoleArn ? props.rootRoleArn : "")
      ),
      // : new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      roleName: name,
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEC2ContainerRegistryFullAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("CloudWatchFullAccess"),
      ],
      maxSessionDuration: cdk.Duration.seconds(43200),
    });

    // Add Secret and SSM access
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
        resources: [`arn:aws:secretsmanager:*:${props.opaEnv.awsAccount}:secret:*`],
      })
    );
    this.IAMRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMReadOnlyAccess"));

    // Bucket creation and tagging and reading for serverless deployments
    this.IAMRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "s3:CreateBucket",
          "s3:PutBucketTagging"
        ],
        effect: iam.Effect.ALLOW,
        resources: ["*"],
        conditions: {
          "StringEquals": {
            "aws:ResourceAccount": props.opaEnv.awsAccount
          }
        }
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
        conditions: {
          "StringEquals": {
            "aws:ResourceAccount": props.opaEnv.awsAccount
          }
        }
      })
    );

    // Add resource group access
    this.IAMRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "resource-groups:ListGroupResources",
          "resource-groups:Tag",
          "resource-groups:DeleteGroup"
        ],
        effect: iam.Effect.ALLOW,
        resources: [`arn:aws:resource-groups:*:${props.opaEnv.awsAccount}:group/*`],
      })
    );

    this.IAMRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "cloudformation:DescribeStacks",
          "cloudformation:ListStackResources"
        ],
        effect: iam.Effect.ALLOW,
        resources: [`arn:aws:cloudformation:*:${props.opaEnv.awsAccount}:stack/${props.opaEnv.prefix}-api-*`],
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
        resources: [`arn:aws:dynamodb:*:${props.opaEnv.awsAccount}:table/*`],
      })
    );

    this.IAMRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["kms:Decrypt"],
        effect: iam.Effect.ALLOW,
        resources: [props.KMSkey.keyArn],
      })
    );

    // this.IAMRole.grantAssumeRole(new iam.ArnPrincipal(`arn:aws:iam::${props.config.Account}:role/backstage*`))

    this.IAMRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["states:*"],
        effect: iam.Effect.ALLOW,
        resources: [`arn:aws:states:*:${props.opaEnv.awsAccount}:*`],
      })
    );

    // Set access for vpc related resources
    for (const vpc of props.vpcCollection) {
      this.IAMRole.addToPolicy(
        new iam.PolicyStatement({
          actions: ["ec2:*"],
          effect: iam.Effect.ALLOW,
          resources: [`arn:aws:ec2:*:${props.opaEnv.awsAccount}:vpc/${vpc.vpcId}`],
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
          conditions: {
            "ArnEquals": {
              "ecs:cluster": ecs.clusterArn
            }
          }
        })
      );
    }

    this.IAMRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["ecs:DescribeTaskDefinition", "ecs:RegisterTaskDefinition"],
        effect: iam.Effect.ALLOW,
        // resources: [ecs.clusterArn, ecs.clusterArn + "/*"],
        resources: ["*"], // Fix for ecs cluster restriction doc https://docs.aws.amazon.com/AmazonECS/latest/userguide/security_iam_id-based-policy-examples.html
      })
    );


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


    // Write Audit access
    this.IAMRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "dynamodb:List*",
          "dynamodb:DescribeStream",
          "dynamodb:DescribeTable",
          "dynamodb:Put*",
        ],
        effect: iam.Effect.ALLOW,
        resources: [`arn:aws:dynamodb:*:${props.opaEnv.awsAccount}:*`],
      })
    );

    // allow creation of a Resource Group to track application resources via tags
    this.IAMRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "resource-groups:CreateGroup"
        ],
        effect: iam.Effect.ALLOW,
        resources: ["*"],  // CreateGroup does not support resource-level permissions and requires a wildcard
      })
    );

    // Add managed role policies to support SAM template deployment for non-root roles
    // 
    // In a production scenario, a customized IAM policy granting specific permissions should be created.
    // See https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-permissions-cloudformation.html
    this.IAMRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AWSCloudFormationFullAccess"));
    this.IAMRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("IAMFullAccess"));
    this.IAMRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AWSLambda_FullAccess"));
    this.IAMRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonAPIGatewayAdministrator"));
    this.IAMRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess"));
    this.IAMRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEC2ContainerRegistryFullAccess"));


    // now save the VPC in SSM Param
    const roleParam = new ssm.StringParameter(this, `${envIdentifier}-role-param`, {
      allowedPattern: ".*",
      description: `The Role for OPA Solution: ${props.opaEnv.envName} Environment`,
      parameterName: `${envPathIdentifier}/role`,
      stringValue: this.IAMRole.roleName,
    });

    const roleArnParam = new ssm.StringParameter(this, `${envIdentifier}-role-arn-param`, {
      allowedPattern: ".*",
      description: `The Role Arn for OPA Solution: ${props.opaEnv.envName} Environment`,
      parameterName: `${envPathIdentifier}/role-arn`,
      stringValue: this.IAMRole.roleArn,
    });

    // Post params to output
    new cdk.CfnOutput(this, "Role Param", {
      value: roleParam.parameterName,
    });

    // Post params to output
    new cdk.CfnOutput(this, "Role Arn Param", {
      value: roleArnParam.parameterName,
    });
  }

}
