// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { NagSuppressions } from "cdk-nag";
import * as iam from "aws-cdk-lib/aws-iam";
import { OPAEnvironmentParams } from "@aws/aws-app-development-common-constructs";
import { ServicePrincipal } from "aws-cdk-lib/aws-iam";
import * as ssm from "aws-cdk-lib/aws-ssm";

export interface EKSKubecltLambdaRoleConstructProps extends cdk.StackProps {
  readonly opaEnv: OPAEnvironmentParams;
  readonly eksClusterName: string;
  readonly existingLambdaExecutionRoleArn: string | null | undefined;

  /**
   * Scope for CfnOutput
   */
  cfnOutputScope: any
}

const defaultProps: Partial<EKSKubecltLambdaRoleConstructProps> = {};

export class EKSKubectlLambdaRoleConstruct extends Construct {
  public iamRole: iam.IRole;
  public kubectlLambdaRoleArnParam: ssm.StringParameter;

  constructor(parent: Construct, name: string, props: EKSKubecltLambdaRoleConstructProps) {
    super(parent, name);

    /* eslint-disable @typescript-eslint/no-unused-vars */
    props = { ...defaultProps, ...props };

    const envIdentifier = `${props.opaEnv.prefix.toLowerCase()}-${props.opaEnv.envName}`;
    const envPathIdentifier = `/${props.opaEnv.prefix.toLowerCase()}/${props.opaEnv.envName.toLowerCase()}`;

    if (props.existingLambdaExecutionRoleArn) {
      this.iamRole = iam.Role.fromRoleArn(this, `${envIdentifier}-kubectl-lambda-role`, props.existingLambdaExecutionRoleArn);
    } else {
      // Create IAM role
      this.iamRole = new iam.Role(this, `${envIdentifier}-kubectl-lambda-role`, {
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
        // roleName: name, - let CDK generate the role name
      });
      NagSuppressions.addResourceSuppressions(this.iamRole, [
        { id: "AwsSolutions-IAM4", reason: "Assumed roles will use AWS managed policies for demonstration purposes.  Customers will be advised/required to assess and apply custom policies based on their role requirements" },
        { id: "AwsSolutions-IAM5", reason: "Assumed roles will require permissions to perform multiple eks, ddb, and ec2 for demonstration purposes.  Customers will be advised/required to assess and apply minimal permission based on role mappings to their idP groups" },
      ], true
      );

      // The kubectl lambda will need to be able to assume a cluster admin role during
      // initial provider creation as well as application-specific (namespace-bound) roles 
      // that have not been created yet and won't be created until developers create new
      // applications that use this provider
      (this.iamRole as iam.Role).addToPolicy(
        new iam.PolicyStatement({
          actions: [
            "sts:AssumeRole",
          ],
          effect: iam.Effect.ALLOW,
          resources: [
            `arn:aws:iam::${props.opaEnv.awsAccount}:role/*`,
          ],
        })
      );

      // Add cluster-specific permissions
      (this.iamRole as iam.Role).addToPolicy(
        new iam.PolicyStatement({
          actions: [
            "eks:DescribeCluster",
          ],
          effect: iam.Effect.ALLOW,
          resources: [
            `arn:aws:eks:${props.opaEnv.awsRegion}:${props.opaEnv.awsAccount}:cluster/${props.eksClusterName}`,
          ],
        })
      );

      this.iamRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEC2ContainerRegistryReadOnly"));
      this.iamRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"));

      // Will be added automatically
      // this.iamRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonElasticContainerRegistryPublicReadOnly"));
    }

    const roleArnParam = new ssm.StringParameter(this, `${envIdentifier}-kubectl-lambda-role-arn-param`, {
      allowedPattern: ".*",
      description: `The kubectl Lambda Execution Role Arn for OPA Solution: ${props.opaEnv.envName} Environment`,
      parameterName: `${envPathIdentifier}/kubectl-lambda-role-arn`,
      stringValue: this.iamRole.roleArn,
    });

    this.kubectlLambdaRoleArnParam = roleArnParam;

  }
}
