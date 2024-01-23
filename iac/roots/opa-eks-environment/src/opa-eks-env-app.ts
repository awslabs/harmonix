#!/usr/bin/env node

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import "source-map-support/register";
import { makeRandom } from "@aws/aws-app-development-common-constructs";
import { OPAEKSEnvStack } from "./opa-eks-environment-stack";
import {
  getAccountId, 
  getRegion, 
  getPrefix, 
  getEnvironmentName,
  validateEKSRequiredEnvVars
} from "./eks-input";

/**
 * Main application function, make it async so it can call asnyc functions properly.
 */
async function main() {
  const app = new cdk.App();

  console.log("Loading Configurations for EKS Environment...");
  validateEKSRequiredEnvVars();

  const account = getAccountId();
  const region = getRegion();
  const env = { region, account };

  // generate unique environment identifier
  const envID = makeRandom(4);
  console.log(`Generating unique Environment identifier: ${envID}`);

  // Deploying EKS cluster
  new OPAEKSEnvStack(app, `EKS-ENV-${getPrefix()}-${getEnvironmentName()}-Stack`, {
    description: `${envID} EKS Environment for OPA`,
    uniqueEnvIdentifier: envID,
    env,
  });

  app.synth();
}

main();
