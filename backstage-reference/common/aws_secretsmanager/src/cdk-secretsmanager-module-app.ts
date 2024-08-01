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
  const appShortName = process.env['APP_SHORT_NAME'] as string;
  const envName = process.env['TARGET_ENV_NAME'] as string;
  const tagKey = `aws-apps:${appShortName}`;
  cdk.Tags.of(app).add(tagKey, appShortName);
  cdk.Tags.of(app).add("aws-resources:provider", envName);
}

const account = app.node.tryGetContext("account") || process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT;

const region =
  app.node.tryGetContext("region") || process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION || "us-east-1";

const env = { region, account };

let stackName;
const uuid = randomUUID();
if (process.env.SECRET_ID) {
  stackName = `${process.env.SECRET_ID}`;
} else if (process.env.APP_SHORT_NAME) {
  stackName = `${process.env.APP_SHORT_NAME}`;
} else {
  stackName = "CdkSecretsManagerStack";
}

new CdkSecretsManagerStack(app, stackName, {
  secretId: process.env.TARGET_SECRET_NAME || "opa-generated-secret",
  secretDescription: process.env.SECRET_DESCRIPTION as string || "Secret created from Backstage",
  //--------------- HOSTED ROTATION AND CROSS ACCOUNT ROLE ACCESS --------------- //
  hostedRotation: process.env.SECRET_HOSTED_ROTATION as string || "",
  crossAccountRoles: process.env.SECRET_CROSS_ACCOUNT_ROLES as string || "",
  kmsCmk: process.env.SECRET_KMS_CMK as string || "",
  env,
});
