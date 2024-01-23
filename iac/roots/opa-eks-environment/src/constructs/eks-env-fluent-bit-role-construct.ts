// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";

// Creates an IAM role for a fluent-bit ServiceAccount that allows for sending logs to CloudWatch.
// This role is not needed if you are only using Fargate.

export interface EKSFluentBitRoleConstructProps extends cdk.StackProps {
  readonly awsAccount: string;
  readonly clusterName: string;
  readonly clusterOpenIdConnectIssuer: string;
  readonly cfnOutputScope: any;
}

const defaultProps: Partial<EKSFluentBitRoleConstructProps> = {};

export class EKSFluentBitRoleConstruct extends Construct {
  public IAMRole: iam.Role;

  constructor(parent: Construct, name: string, props: EKSFluentBitRoleConstructProps) {
    super(parent, name);

    /* eslint-disable @typescript-eslint/no-unused-vars */
    props = { ...defaultProps, ...props };

const stringEquals = new cdk.CfnJson(this, 'ConditionJson', {
  value: {
    [`${props.clusterOpenIdConnectIssuer}:aud`]: 'sts.amazonaws.com',
    [`${props.clusterOpenIdConnectIssuer}:sub`]: `system:serviceaccount:amazon-cloudwatch:fluent-bit`,
  },
});

// Create IAM role
this.IAMRole = new iam.Role(this, `${props.clusterName}-service-account-role`, {
  description: `IAM role for fluent-bit serviceaccount for EKS cluster "${props.clusterName}"`,
  managedPolicies: [
    iam.ManagedPolicy.fromAwsManagedPolicyName("CloudWatchAgentServerPolicy"),
  ],
  assumedBy: new iam.FederatedPrincipal(
    cdk.Fn.join('', [`arn:aws:iam::${props.awsAccount}:oidc-provider/`, `${props.clusterOpenIdConnectIssuer}`]),
    {
      StringEquals: stringEquals,
    },
    'sts:AssumeRoleWithWebIdentity'
  ),
  roleName: name,
});

    // Post params to output
    new cdk.CfnOutput(props.cfnOutputScope, "FluentBitRoleARN", {
      value: this.IAMRole.roleArn,
    });

  }

}
