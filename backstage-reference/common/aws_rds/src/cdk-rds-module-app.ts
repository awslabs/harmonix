#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { randomUUID as uuid } from "crypto";
import { CdkRdsModuleStack } from "./cdk-rds-module-stack";

const app = new cdk.App();

const account = app.node.tryGetContext("account") || process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT;

const region =
  app.node.tryGetContext("region") || process.env.REGION || process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION || "us-east-1";
console.log(`Selected region: ${region}`)
const env = { region, account };

let stackName; 
if (process.env.RDS_ID) {
  stackName = `${process.env.RDS_ID}-rds-resource`;
 } else if (process.env.APP_SHORT_NAME) {
  stackName = `${process.env.APP_SHORT_NAME}-rds-resource`
 } else {
  stackName = `rds-resource-${uuid()}`;
 }

new CdkRdsModuleStack(app, stackName, {env});
