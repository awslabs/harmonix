#!/usr/bin/env node

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import "source-map-support/register";
import { OPAServerlessEnvStack } from "./opa-serverless-environment-stack";
import { makeRandom } from "@aws/aws-app-development-common-constructs";

function serverlessMandatory(propertyName: string) {
  if (!process.env[propertyName])
    throw new Error(`${propertyName} Environment variable is missing and mandatory for Serverless environment`);
}

/**
 * Main application function, make it async so it can call asnyc functions properly.
 */
async function main() {
  const app = new cdk.App();

  console.log("Loading Configurations for Serverless Environment...");

  const account = process.env.AWS_ACCOUNT_ID as string;
  const region = process.env.AWS_DEFAULT_REGION as string;

  const env = { region, account };

  serverlessMandatory("ENV_NAME");
  serverlessMandatory("AWS_ACCOUNT_ID");
  serverlessMandatory("PLATFORM_ROLE_ARN");
  serverlessMandatory("PIPELINE_ROLE_ARN");

  // generate unique environment identifier
  const envID = makeRandom(4);
  console.log("Generating unique Environment identifier for Serverless environment: " + envID)

  // scope: Construct, id: string, props: OPAServerlessEnvStackProps
  new OPAServerlessEnvStack(app, `SERVERLESS-ENV-${process.env.ENV_NAME}-Stack`, {
    // stackName: `opa-serverless-api-environment`,  // Do not use stack name to get a generated stack name so multiple stacks can be created
    description: `${envID} Serverless Environment for OPA(AWS App Development)`,
    uniqueEnvIdentifier: envID,
    env,
  });


  app.synth();
}

main();
