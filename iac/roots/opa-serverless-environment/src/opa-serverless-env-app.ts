#!/usr/bin/env node

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import "source-map-support/register";
import { OPAServerlessEnvStack } from "./opa-serverless-environment-stack";
import { makeRandom } from "@aws/aws-app-development-common-constructs";
import {
  getAccountId, 
  getRegion, 
  getPrefix, 
  getEnvironmentName, 
  validateServerlessRequiredEnvVars
} from "./serverless-input";

/**
 * Main application function, make it async so it can call asnyc functions properly.
 */
async function main() {
  const app = new cdk.App();

  console.log("Loading Configurations for Serverless Environment...");
  validateServerlessRequiredEnvVars();

  const account = getAccountId();
  const region = getRegion();

  const env = { region, account };

  // generate unique environment identifier
  const envID = makeRandom(4);
  console.log("Generating unique Environment identifier for Serverless environment: " + envID)

  // scope: Construct, id: string, props: OPAServerlessEnvStackProps
  new OPAServerlessEnvStack(app, `SERVERLESS-ENV-${getPrefix()}-${getEnvironmentName()}-Stack`, {
    // stackName: `opa-serverless-api-environment`,  // Do not use stack name to get a generated stack name so multiple stacks can be created
    description: `${envID} Serverless Environment for OPA(AWS App Development)`,
    uniqueEnvIdentifier: envID,
    env,
  });

  app.synth();
}

main();
