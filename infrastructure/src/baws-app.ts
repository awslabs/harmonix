#!/usr/bin/env node

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import "source-map-support/register";
import { BAWSPrereqStack } from "./baws-prereq-stack";
import { BAWSStack } from "./baws-solution-stack";
import { BAWSGitLabRunnerStack } from "./baws-gitlab-runner-stack";
import { CfWafStack } from "./cf-waf-stack";
import { getGitContext } from "./helpers/git";
import { getConfig } from "./helpers/infra-config";

/**
 * Main application function, make it async so it can call asnyc functions properly.
 */
async function main() {
  const app = new cdk.App();

  //Load config, when ready start the app
  const config = await getConfig(app.node.tryGetContext("account") || process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT);
  
  if (!config) throw Error("Config not defined");

  console.log("Loading Configurations...");
  config.Branch = getGitContext().appStackName;
  const envName='baws'
  const account =
    app.node.tryGetContext("account") ||
    process.env.CDK_DEPLOY_ACCOUNT ||
    process.env.CDK_DEFAULT_ACCOUNT ||
    config.Account;

  const region =
    app.node.tryGetContext("region") ||
    process.env.CDK_DEPLOY_REGION ||
    process.env.CDK_DEFAULT_REGION;

  const env = { region, account };

  // Deploy Waf for CloudFront in us-east-1
    
  new BAWSPrereqStack(app, "BAWSPrereqStack", {
    stackName: `${envName}-prereq`,
    config,
    env,
  });

  const cfWafStack = new CfWafStack(app, 'BAWSWaf', {
    env: { region: "us-east-1", account },
    stackName: envName + "-waf",
  });

  const solutionStack = new BAWSStack(app, "BAWSStack", {
    stackName: `${envName}-solution`,
    description: 'App Development for Backstage on AWS (uksb-1tupbocl5)',
    config,
    env,
  });

  const gitlabRunnerStack = new BAWSGitLabRunnerStack(app, 'BAWSGitLabRunnerStack', {
    stackName: `${envName}-gitlab-runner`,
    config,
    env,
  });

  solutionStack.addDependency(cfWafStack);
  gitlabRunnerStack.addDependency(solutionStack);

  app.synth();
}


main();
