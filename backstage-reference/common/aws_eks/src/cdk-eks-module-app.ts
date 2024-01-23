#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { EksResourcesStack } from "./cdk-eks-module-stack";
import {
  getAccountId,
  getRegion,
  getStackName,
} from "./eks-input";

const app = new cdk.App();

const account = getAccountId();
const region = getRegion();
console.log(`Selected region: ${region}`);
const env = { region, account };

const stackName = getStackName();

new EksResourcesStack(app, stackName, { env });

