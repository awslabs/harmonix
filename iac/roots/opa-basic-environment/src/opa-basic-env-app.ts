#!/usr/bin/env node

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import "source-map-support/register";
import { OPABasicEnvStack } from "./opa-basic-environment-stack";
import { makeRandom } from "@aws/aws-app-development-common-constructs";

function basicMandatory(propertyName: string) {
  if (!process.env[propertyName])
    throw new Error(`${propertyName} Environment variable is missing and mandatory for Basic environment`);
}

/**
 * Main application function, make it async so it can call asnyc functions properly.
 */
async function main() {
  const app = new cdk.App();

  console.log("Loading Configurations for Basic Environment...");

  const account = process.env.AWS_ACCOUNT_ID as string;
  const region = process.env.AWS_DEFAULT_REGION as string;

  const env = { region, account };

  basicMandatory("ENV_NAME");
  basicMandatory("AWS_ACCOUNT_ID");
  basicMandatory("PLATFORM_ROLE_ARN");
  basicMandatory("PIPELINE_ROLE_ARN");

  // generate unique environment identifier
  const envID = makeRandom(4);
  console.log("Generating unique Environment identifier for Basic environment: " + envID)

  // scope: Construct, id: string, props: OPABasicEnvStackProps
  new OPABasicEnvStack(app, `BASIC-ENV-${process.env.ENV_NAME}-Stack`, {
    // stackName: `opa-basic-environment`,  // Do not use stack name to get a generated stack name so multiple stacks can be created
    description: `${envID} Basic Environment for OPA(AWS App Development)`,
    uniqueEnvIdentifier: envID,
    env,
  });


  app.synth();
}

main();
