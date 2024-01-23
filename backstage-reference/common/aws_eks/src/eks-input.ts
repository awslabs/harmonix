#!/usr/bin/env node

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { randomUUID as uuid } from 'crypto';

export interface OPAEnvironmentParams {
  readonly awsAccount: string;
  readonly awsRegion: string;
  readonly envName: string;
  readonly prefix: string;
}

// Environment variables that can be passed in and used in this stack
// The env var names must match the values passed in from scaffolder action(s) building this stack
export enum STACK_EKS_ENV_VARS {
  APP_SHORT_NAME = "APP_SHORT_NAME",
  K8S_IAM_ROLE_BINDING_TYPE = "K8S_IAM_ROLE_BINDING_TYPE",
  NAMESPACE = "NAMESPACE",
  CLUSTER_OIDC_PROVIDER = "CLUSTER_OIDC_PROVIDER",
  PREFIX = "PREFIX",
  TARGET_EKS_CLUSTER_ARN = "TARGET_EKS_CLUSTER_ARN",
  TARGET_ENV_NAME = "TARGET_ENV_NAME",
  TARGET_ENV_PROVIDER_NAME = "TARGET_ENV_PROVIDER_NAME",
}

export function validateEKSStackRequiredEnvVars() {
  Object.values(STACK_EKS_ENV_VARS).forEach(val => {
    if (!process.env[val]) {
      throw new Error(`${val} Environment variable is missing and mandatory for EKS stack`);
    }
  });
}

export function getAccountId(): string {
  return (process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT) as string
}

export function getClusterArn(): string {
  return process.env[STACK_EKS_ENV_VARS.TARGET_EKS_CLUSTER_ARN] as string;
}

export function getClusterName(): string {
  const clusterArn = getClusterArn();
  return clusterArn.substring(clusterArn.lastIndexOf('/') + 1);
}

export function getK8sIamRoleBindingType(): string {
  return process.env[STACK_EKS_ENV_VARS.K8S_IAM_ROLE_BINDING_TYPE] as string;
}

export function getEnvironmentName(): string {
  return process.env[STACK_EKS_ENV_VARS.TARGET_ENV_NAME] as string;
}

export function getEnvironmentProviderName(): string {
  return process.env[STACK_EKS_ENV_VARS.TARGET_ENV_PROVIDER_NAME] as string;
}

export function getNamespace(): string {
  return process.env[STACK_EKS_ENV_VARS.NAMESPACE] as string;
}

export function getClusterOidcProvider(): string {
  return process.env[STACK_EKS_ENV_VARS.CLUSTER_OIDC_PROVIDER] as string;
}

export function getPrefix(): string {
  return process.env[STACK_EKS_ENV_VARS.PREFIX] as string;
}

export function getRegion(): string {
  return (process.env.REGION || process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION || "us-east-1") as string;
}

export function getResourceTags(): string {
  return process.env.AWS_RESOURCE_TAGS as string;
}

export function getStackName(): string {
  return (process.env.APP_SHORT_NAME ? `${process.env.APP_SHORT_NAME}-eks-resources${getStackSuffix()}` : `eks-resources-${uuid()}`);
}

export function getStackSuffix(): string {
  return (getEnvironmentProviderName() ? `-${getEnvironmentName()}-${getEnvironmentProviderName()}` : '') as string;
}

export function getAppAdminRoleArn(): string {
  let appAdminRoleArn = process.env.APP_ADMIN_ROLE_ARN;
  if (appAdminRoleArn) {
    appAdminRoleArn = appAdminRoleArn.replace(/ /g, ''); // remove all whitespace
  }
  return appAdminRoleArn as string || '';
}

