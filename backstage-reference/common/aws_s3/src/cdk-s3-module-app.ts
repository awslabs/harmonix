#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { randomUUID as uuid } from "crypto";
import { CdkS3ModuleStack } from "./cdk-s3-module-stack";

const app = new cdk.App();

const account = app.node.tryGetContext("account") || process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT;

const region =
  app.node.tryGetContext("region") || process.env.REGION || process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION || "us-east-1";
console.log(`Selected region: ${region}`)
const env = { region, account };

let stackName; 
if (process.env.TARGET_BUCKET_NAME) {
  stackName = `${process.env.TARGET_BUCKET_NAME}-s3-resource`;
 } else {
  stackName = `s3-resource-${uuid()}`;
 }

console.log(`Stack Name: ${stackName}`)

new CdkS3ModuleStack(app, stackName, {env});
