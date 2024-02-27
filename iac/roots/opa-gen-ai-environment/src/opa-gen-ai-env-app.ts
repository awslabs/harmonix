#!/usr/bin/env node

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import "source-map-support/register";
import { OPAGenAIEnvStack } from "./opa-gen-ai-environment-stack";
import { makeRandom } from "@aws/aws-app-development-common-constructs";

function genAIMandatory(propertyName: string) {
  if (!process.env[propertyName])
    throw new Error(`${propertyName} Environment variable is missing and mandatory for Gen AI Serverless environment`);
}

/**
 * Main application function, make it async so it can call asnyc functions properly.
 */
async function main() {
  const app = new cdk.App();

  console.log("Loading Configurations for Gen AI Environment...");

  const account = process.env.AWS_ACCOUNT_ID as string;
  const region = process.env.AWS_DEFAULT_REGION as string;

  const env = { region, account };

  genAIMandatory("ENV_NAME");
  genAIMandatory("AWS_ACCOUNT_ID");
  genAIMandatory("PLATFORM_ROLE_ARN");
  genAIMandatory("PIPELINE_ROLE_ARN");

  // generate unique environment identifier
  const envID = makeRandom(4);
  console.log("Generating unique Environment identifier for Gen AI environment: " + envID)

  // scope: Construct, id: string, props: OPAServerlessEnvStackProps
  new OPAGenAIEnvStack(app, `GEN-AI-ENV-${process.env.ENV_NAME}-Stack`, {
    // stackName: `opa-serverless-api-environment`,  // Do not use stack name to get a generated stack name so multiple stacks can be created
    description: `${envID} Gen AI Environment for OPA(AWS App Development)`,
    uniqueEnvIdentifier: envID,
    env,
  });


  app.synth();
}

main();
