#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import "source-map-support/register";
import { randomUUID } from "crypto";
import { CdkSecretsManagerStack } from "./cdk-secretsmanager-module-stack";

const app = new cdk.App();

// If an application short name was provided, associate the AWS resources
// created in this app with it through tagging
if (process.env['APP_SHORT_NAME']) {
  // Tag all resources so that they can be grouped together in a Resource Group
  const appShortName = process.env['APP_SHORT_NAME'];
  const tagKey = `aws-apps:${appShortName}`;
  cdk.Tags.of(app).add(tagKey, appShortName);
}

const account = app.node.tryGetContext("account") || process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT;

const region =
  app.node.tryGetContext("region") || process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION || "us-east-1";

const env = { region, account };

let stackName;
const uuid = randomUUID();
if (process.env.SECRET_ID) {
  stackName = `${process.env.SECRET_ID}-${uuid}`;
} else if (process.env.APP_SHORT_NAME) {
  stackName = `${process.env.APP_SHORT_NAME}-${uuid}`;
} else {
  stackName = `CdkSecretsManagerStack-${uuid}`;
}

new CdkSecretsManagerStack(app, stackName, {
  secretId: process.env.SECRET_ID || "opa-generated-secret",
  secretDescription: process.env.SECRET_DESCRIPTION || "Secret created from Backstage",
  env,
});
