#!/usr/bin/env node

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import { AwsSolutionsChecks, NagSuppressions } from "cdk-nag";
import "source-map-support/register";
import { OPAPlatformStack } from "./opa-platform-stack";

/**
 * Main application function, make it async so it can call asnyc functions properly.
 */
async function main() {
  const app = new cdk.App();
  cdk.Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

  const account = process.env.AWS_ACCOUNT_ID || process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT;
  const region = process.env.AWS_DEFAULT_REGION || process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION;

  const env = { region, account };

  const platformStack = new OPAPlatformStack(app, "OPAStack", {
    stackName: `opa-platform`,
    description: "OPA on AWS Backstage IDP for AWS (uksb-1tupbocl5)",
    env,
  });

  // Suppress CDK-Nag warnings for intrinsic function references
  NagSuppressions.addStackSuppressions(platformStack, [
    { id: "CdkNagValidationFailure", reason: `CDK cannot validate intrinsic function references from VPC endpoints.  Suppressing warnings.  See https://github.com/cdklabs/cdk-nag/issues/817` },
  ], true);

  app.synth();
}

main();
