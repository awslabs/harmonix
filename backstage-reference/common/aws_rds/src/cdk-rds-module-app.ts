#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { randomUUID as uuid } from "crypto";
import { CdkRdsModuleStack } from "./cdk-rds-module-stack";

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
if (process.env.RDS_ID) {
  stackName = `${process.env.RDS_ID}-rds-resource`;
 } else if (process.env.APP_SHORT_NAME) {
  stackName = `${process.env.APP_SHORT_NAME}-rds-resource`
 } else {
  stackName = `rds-resource-${uuid()}`;
 }

new CdkRdsModuleStack(app, stackName, {
  vpcId: process.env.TARGET_VPCID || "missing",
  dbName: process.env.DB_NAME,
  rdsId: process.env.RDS_ID,
  env,
});
