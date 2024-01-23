#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { randomUUID as uuid } from 'crypto';
import { EcsResourcesStack } from './cdk-ecs-module-stack';

const app = new cdk.App();

const account = app.node.tryGetContext("account") || process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT;

const region =
  app.node.tryGetContext("region") || process.env.REGION || process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION || "us-east-1";
console.log(`Selected region: ${region}`);
const env = { region, account };

const stackSufix = process.env.TARGET_ENV_PROVIDER_NAME ? `-${process.env.TARGET_ENV_PROVIDER_NAME}` : '';
const stackName = process.env.APP_SHORT_NAME ? `${process.env.APP_SHORT_NAME}-ecs-resources${stackSufix}` : `ecs-resources-${uuid()}`;

new EcsResourcesStack(app, stackName, { env });
