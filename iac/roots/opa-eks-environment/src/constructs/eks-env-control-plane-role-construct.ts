// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { NagSuppressions } from "cdk-nag";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { OPAEnvironmentParams } from "@aws/aws-app-development-common-constructs";

export interface EKSControlPlaneConstructProps extends cdk.StackProps {
  readonly opaEnv: OPAEnvironmentParams;
  /**
   * Scope for CfnOutput
   */
  cfnOutputScope: any
}

const defaultProps: Partial<EKSControlPlaneConstructProps> = {};

export class EKSControlPlaneRoleConstruct extends Construct {
  public IAMRole: iam.Role;
  public controlPlaneRoleParam: ssm.StringParameter;
  public controlPlaneRoleArnParam: ssm.StringParameter;

  constructor(parent: Construct, name: string, props: EKSControlPlaneConstructProps) {
    super(parent, name);

    /* eslint-disable @typescript-eslint/no-unused-vars */
    props = { ...defaultProps, ...props };

    const envIdentifier = `${props.opaEnv.prefix.toLowerCase()}-${props.opaEnv.envName}`;
    const envPathIdentifier = `/${props.opaEnv.prefix.toLowerCase()}/${props.opaEnv.envName.toLowerCase()}`;

    // Create Iam role
    this.IAMRole = new iam.Role(this, `${envIdentifier}-role`, {
      assumedBy: new iam.ServicePrincipal("eks.amazonaws.com"),
      roleName: name,
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEKSClusterPolicy"),
      ],
      maxSessionDuration: cdk.Duration.seconds(43200),
    });
    NagSuppressions.addResourceSuppressions(this.IAMRole, [
      { id: "AwsSolutions-IAM4", reason: "Assumed roles will use AWS managed policies for demonstration purposes.  Customers will be advised/required to assess and apply custom policies based on their role requirements" },
      { id: "AwsSolutions-IAM5", reason: "Assumed roles will require permissions to perform multiple ecs, ddb, and ec2 for demonstration purposes.  Customers will be advised/required to assess and apply minimal permission based on role mappings to their idP groups" },
    ], true
    );

    // now save the Role in SSM Param
    const roleParam = new ssm.StringParameter(this, `${envIdentifier}-role-param`, {
      allowedPattern: ".*",
      description: `The EKS Control Plane Role for OPA Solution: ${props.opaEnv.envName} Environment`,
      parameterName: `${envPathIdentifier}/eks-control-plane-role`,
      stringValue: this.IAMRole.roleName,
    });

    const roleArnParam = new ssm.StringParameter(this, `${envIdentifier}-role-arn-param`, {
      allowedPattern: ".*",
      description: `The EKS Cluster Control Plane Role Arn for OPA Solution: ${props.opaEnv.envName} Environment`,
      parameterName: `${envPathIdentifier}/eks-control-plane-role-arn`,
      stringValue: this.IAMRole.roleArn,
    });

    // Post params to output
    new cdk.CfnOutput(props.cfnOutputScope, "ContolPlaneRoleParam", {
      value: roleParam.parameterName,
    });

    // Post params to output
    new cdk.CfnOutput(props.cfnOutputScope, "ControlPlaneRoleArnParam", {
      value: roleArnParam.parameterName,
    });
    this.controlPlaneRoleParam = roleParam;
    this.controlPlaneRoleArnParam = roleArnParam;
  }

}
