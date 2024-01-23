// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { NagSuppressions } from "cdk-nag";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { OPAEnvironmentParams } from "@aws/aws-app-development-common-constructs";

export interface EKSPodExecutionRoleConstructProps extends cdk.StackProps {
  readonly opaEnv: OPAEnvironmentParams;
  readonly clusterName: string;
  /**
   * Scope for CfnOutput
   */
  cfnOutputScope: any
}

const defaultProps: Partial<EKSPodExecutionRoleConstructProps> = {};

export class EKSPodExecutionRoleConstruct extends Construct {
  public IAMRole: iam.Role;
  public podExecutionRoleParam: ssm.StringParameter;
  public podExecutionRoleArnParam: ssm.StringParameter;

  constructor(parent: Construct, name: string, props: EKSPodExecutionRoleConstructProps) {
    super(parent, name);

    /* eslint-disable @typescript-eslint/no-unused-vars */
    props = { ...defaultProps, ...props };

    const envIdentifier = `${props.opaEnv.prefix.toLowerCase()}-${props.opaEnv.envName}`;
    const envPathIdentifier = `/${props.opaEnv.prefix.toLowerCase()}/${props.opaEnv.envName.toLowerCase()}`;

    const cloudwatchLogsPolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          resources: ['*'],
          effect: iam.Effect.ALLOW,
          actions: [
            "logs:CreateLogStream",
            "logs:CreateLogGroup",
            "logs:DescribeLogStreams",
            "logs:PutLogEvents",
            "logs:PutRetentionPolicy",
          ],
        }),
      ],
    });

    // Create IAM role for pod execution (not for pod service accounts)
    this.IAMRole = new iam.Role(this, `${envIdentifier}-pod-execution-role`, {
      assumedBy: new iam.PrincipalWithConditions(new iam.ServicePrincipal("eks-fargate-pods.amazonaws.com"),
        {
          ArnLike: {
            "aws:SourceArn": `arn:aws:eks:${props.opaEnv.awsRegion}:${props.opaEnv.awsAccount}:fargateprofile/${props.clusterName}/*`
          }
        }),

      roleName: name,
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEKSFargatePodExecutionRolePolicy"),
      ],
      inlinePolicies: { logsPolicy: cloudwatchLogsPolicy },
      maxSessionDuration: cdk.Duration.seconds(43200),
    });
    NagSuppressions.addResourceSuppressions(this.IAMRole, [
      { id: "AwsSolutions-IAM4", reason: "Assumed roles will use AWS managed policies for demonstration purposes.  Customers will be advised/required to assess and apply custom policies based on their role requirements" },
      { id: "AwsSolutions-IAM5", reason: "Assumed roles will require permissions to perform multiple ecs, ddb, and ec2 for demonstration purposes.  Customers will be advised/required to assess and apply minimal permission based on role mappings to their idP groups" },
    ], true
    );

    // now save the Role in SSM Param
    const roleParam = new ssm.StringParameter(this, `${envIdentifier}-pod-execution-role-param`, {
      allowedPattern: ".*",
      description: `Pod Execution Role for OPA Solution: ${props.opaEnv.envName} Environment`,
      parameterName: `${envPathIdentifier}/pod-execution-role`,
      stringValue: this.IAMRole.roleName,
    });

    const roleArnParam = new ssm.StringParameter(this, `${envIdentifier}-role-arn-param`, {
      allowedPattern: ".*",
      description: `The EKS Cluster Control Plane Role Arn for OPA Solution: ${props.opaEnv.envName} Environment`,
      parameterName: `${envPathIdentifier}/pod-execution-role-arn`,
      stringValue: this.IAMRole.roleArn,
    });

    // Post params to output
    new cdk.CfnOutput(props.cfnOutputScope, "PodExecutionRoleParam", {
      value: roleParam.parameterName,
    });

    // Post params to output
    new cdk.CfnOutput(props.cfnOutputScope, "PodExecutionRoleArnParam", {
      value: roleArnParam.parameterName,
    });
    this.podExecutionRoleParam = roleParam;
    this.podExecutionRoleArnParam = roleArnParam;
  }

}
