#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { randomUUID as uuid } from 'crypto';
import { ServerlessApiResourcesStack } from './cdk-serverless-api-module-stack';

const app = new cdk.App();

const account = app.node.tryGetContext("account") || process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT;

const region =
  app.node.tryGetContext("region") || process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION || "us-east-1";

const env = { region, account };

const stackSufix = process.env.TARGET_ENV_PROVIDER_NAME ? `-${process.env.TARGET_ENV_PROVIDER_NAME}` : '';
const stackName = process.env.APP_SHORT_NAME ? `${process.env.APP_SHORT_NAME}-serverless-api-resources${stackSufix}` : `serverless-api-resources-${uuid()}`;

new ServerlessApiResourcesStack(app, stackName, { env });
