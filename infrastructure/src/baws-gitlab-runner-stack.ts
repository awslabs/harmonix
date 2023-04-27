// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";

import * as ec2 from "aws-cdk-lib/aws-ec2";

import { Construct } from "constructs";
import { GitlabRunnerConstruct } from "./constructs/gitlab-runner-construct";
import { BackstageInfraConfig } from "./helpers/infra-config";

export interface BAWSGitLabRunnerStackProps extends cdk.StackProps {

  readonly config: BackstageInfraConfig;
}

export class BAWSGitLabRunnerStack extends cdk.Stack {

  constructor(scope: Construct, id: string, props: BAWSGitLabRunnerStackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, 'ImportVPC', { vpcName: "Backstage Network" });
    const runnerSg = ec2.SecurityGroup.fromLookupByName(this, 'RunnerSG', `${props.config.AppPrefix}-alb-gitlab-runner-sg`, vpc);

    // Create EC2 Gitlab Runner
    new GitlabRunnerConstruct(this, "GitlabRunner Construct", {
      config: props.config,
      vpc,
      runnerSg
    });

  }
}
