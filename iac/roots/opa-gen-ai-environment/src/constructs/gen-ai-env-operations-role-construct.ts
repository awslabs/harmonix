// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { OPAEnvironmentParams } from "@aws/aws-app-development-common-constructs";

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface GenAIOperationsConstructProps extends cdk.StackProps {
  readonly opaEnv: OPAEnvironmentParams;
  KMSkey: kms.IKey;
  vpcCollection: ec2.IVpc[];
  assumedBy: string;
  auditTable: string;
}

const defaultProps: Partial<GenAIOperationsConstructProps> = {};

export class GenAIOperationsConstruct extends Construct {
  public IAMRole: iam.Role;
  public operationsRoleParam: ssm.StringParameter;
  public operationsRoleArnParam: ssm.StringParameter;

  constructor(parent: Construct, name: string, props: GenAIOperationsConstructProps) {
    super(parent, name);

    /* eslint-disable @typescript-eslint/no-unused-vars */
    props = { ...defaultProps, ...props };

    const envIdentifier = `${props.opaEnv.prefix.toLowerCase()}-${props.opaEnv.envName}`;
    const envPathIdentifier = `/${props.opaEnv.prefix.toLowerCase()}/${props.opaEnv.envName.toLowerCase()}`;

    // Create Iam role
    this.IAMRole = new iam.Role(this, `${envIdentifier}-role`, {
      assumedBy: new iam.ArnPrincipal(props.assumedBy),
      roleName: name,
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEC2ContainerRegistryFullAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("CloudWatchFullAccess"),
        // OpenSearch Service Policy
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonOpenSearchServiceFullAccess"),

      ],
      maxSessionDuration: cdk.Duration.seconds(43200),
    });

        // add open search permissions
        this.IAMRole.addToPolicy(
          new iam.PolicyStatement({
            actions: ["ec2:*"],
            effect: iam.Effect.ALLOW,
            resources: ["*"]
          })
        )

    // add open search permissions
    this.IAMRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["aoss:*"],
        effect: iam.Effect.ALLOW,
        resources: ["*"]
      })
    )
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
    this.IAMRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMFullAccess"));

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

    this.IAMRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "resource-groups:ListGroupResources"
        ],
        effect: iam.Effect.ALLOW,
        resources: [`arn:aws:resource-groups:*:${props.opaEnv.awsAccount}:group/*`],
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
        resources: [`arn:aws:dynamodb:*:${props.opaEnv.awsAccount}:${props.auditTable}`],
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

    // allow SAM template conversion into standard CloudFormation
    this.IAMRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "cloudformation:CreateChangeSet",
        ],
        effect: iam.Effect.ALLOW,
        resources: [
          "arn:aws:cloudformation:*:aws:transform/Include",
          "arn:aws:cloudformation:*:aws:transform/Serverless-2016-10-31"
        ]
      })
    );

    // allow deploying the serverless application stack (such as a SAM template)
    this.IAMRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "cloudformation:CreateChangeSet",
          "cloudformation:CreateStack",
          "cloudformation:DeleteStack",
          "cloudformation:DescribeStacks",
          "cloudformation:DescribeStackEvents",
          "cloudformation:ListStackResources",
          "cloudformation:UpdateStack",
        ],
        effect: iam.Effect.ALLOW,
        resources: [`arn:aws:cloudformation:*:${props.opaEnv.awsAccount}:stack/*`],
        conditions: {
          "StringEquals": {
            "aws:ResourceAccount": props.opaEnv.awsAccount
          }
        }
      })
    );

    // allow creating security groups for Lambda functions
    this.IAMRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "ec2:AuthorizeSecurityGroupEgress",
          "ec2:AuthorizeSecurityGroupIngress",
          "ec2:CreateSecurityGroup",
          "ec2:CreateTags",
          "ec2:DeleteSecurityGroup",
          "ec2:DescribeSecurityGroups",
          "ec2:ModifySecurityGroupRules",
          "ec2:RevokeSecurityGroupEgress",
          "ec2:RevokeSecurityGroupIngress",
        ],
        effect: iam.Effect.ALLOW,
        resources: [`*`],
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

    // now save the VPC in SSM Param
    const roleParam = new ssm.StringParameter(this, `${envIdentifier}-role-param`, {
      allowedPattern: ".*",
      description: `The Operations Role for OPA Solution: ${props.opaEnv.envName} Environment`,
      parameterName: `${envPathIdentifier}/operations-role`,
      stringValue: this.IAMRole.roleName,
    });

    const roleArnParam = new ssm.StringParameter(this, `${envIdentifier}-role-arn-param`, {
      allowedPattern: ".*",
      description: `The Operations Role Arn for OPA Solution: ${props.opaEnv.envName} Environment`,
      parameterName: `${envPathIdentifier}/operations-role-arn`,
      stringValue: this.IAMRole.roleArn,
    });

    this.operationsRoleParam = roleParam;
    this.operationsRoleArnParam = roleArnParam;

  }

}
