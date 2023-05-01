#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { randomUUID as uuid } from "crypto";
import { CdkEfsModuleStack } from "./cdk-efs-module-stack";

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
if (process.env.EFS_NAME) {
  stackName = `${process.env.EFS_NAME}-efs-resource`;
 } else if (process.env.APP_SHORT_NAME) {
  stackName = `${process.env.APP_SHORT_NAME}-efs-resource`
 } else {
  stackName = `efs-resource-${uuid()}`;
 }

new CdkEfsModuleStack(app, stackName, {
  vpcId: process.env.TARGET_VPCID || "missing",
  efsName: process.env.EFS_NAME,
  efsAccessPointPath: process.env.EFS_ACCESS_POINT_PATH,
  env,
});
