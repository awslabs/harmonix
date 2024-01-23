#!/usr/bin/env node

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export enum EKS_ENV_VARS {
  API_ACCESS = "API_ACCESS",
  AWS_ACCOUNT_ID = "AWS_ACCOUNT_ID",
  AWS_DEFAULT_REGION = "AWS_DEFAULT_REGION",
  ENV_NAME = "ENV_NAME",
  NODE_TYPE = "NODE_TYPE",
  PIPELINE_ROLE_ARN = "PIPELINE_ROLE_ARN",
  PLATFORM_ROLE_ARN = "PLATFORM_ROLE_ARN",
  PREFIX = "PREFIX",
}

export enum EKS_OPTIONAL_ENV_VARS {
  API_ACCESS_CIDRS = "API_ACCESS_CIDRS",
  CLUSTER_ADMIN_ROLE_ARN = "CLUSTER_ADMIN_ROLE_ARN",
  VPC_ID = "VPC_ID",
  ENV_CIDR = "ENV_CIDR",
  EXISTING_CLUSTER_NAME = "EXISTING_CLUSTER_NAME",
  KUBECTL_LAMBDA_ARN = "KUBECTL_LAMBDA_ARN",
  KUBECTL_ON_EVENT_LAMBDA_ARN = "KUBECTL_ON_EVENT_LAMBDA_ARN",
  EXISTING_KUBECTL_LAMBDA_EXECUTION_ROLE_ARN = "EXISTING_KUBECTL_LAMBDA_EXECUTION_ROLE_ARN",
  CREATE_K8S_OPA_RESOURCES = "CREATE_K8S_OPA_RESOURCES"
}

export enum NODE_TYPE {
  MANAGED = "MANAGED",
  FARGATE = "FARGATE",
}

export function validateEKSRequiredEnvVars() {
  Object.values(EKS_ENV_VARS).forEach(val => {
    if (!process.env[val]) {
      throw new Error(`${val} Environment variable is missing and mandatory for EKS environment`);
    }
  });
}

export function getAccountId(): string {
  return getTrimmedValue(process.env[EKS_ENV_VARS.AWS_ACCOUNT_ID]);
}

export function getEnvironmentName(): string {
  return process.env[EKS_ENV_VARS.ENV_NAME] as string
}

export function getRegion(): string {
  return process.env[EKS_ENV_VARS.AWS_DEFAULT_REGION] as string
}

export function getPrefix(): string {
  return process.env[EKS_ENV_VARS.PREFIX] as string || "opa";
}

export function getNodeType(): string {
  return process.env[EKS_ENV_VARS.NODE_TYPE] as string;
}

export function getInstanceType(): string {
  return process.env["INSTANCE_TYPE"] as string || "";
}

export function getAmiType(): string {
  return process.env["AMI_TYPE"] as string || "";
}

export function getNodeGroupDesiredSize(): number {
  const strSize = process.env["NODE_GROUP_DESIRED_SIZE"] as string;
  if (strSize) {
    return parseInt(strSize);
  }
  return 0;
}

export function getNodeGroupMinSize(): number {
  const strSize = process.env["NODE_GROUP_MIN_SIZE"] as string;
  if (strSize) {
    return parseInt(strSize);
  }
  return 0;
}

export function getNodeGroupMaxSize(): number {
  const strSize = process.env["NODE_GROUP_MAX_SIZE"] as string;
  if (strSize) {
    return parseInt(strSize);
  }
  return 0;
}

export function getNodeGroupDiskSize(): number {
  const strSize = process.env["NODE_GROUP_DISK_SIZE"] as string;
  if (strSize) {
    return parseInt(strSize);
  }
  return 0;
}

export function getVpcCIDR(): string {
  return process.env[EKS_OPTIONAL_ENV_VARS.ENV_CIDR] as string || "10.0.0.0/24";
}

export function getExistingVpcId(): string {
  return process.env[EKS_OPTIONAL_ENV_VARS.VPC_ID] as string;
}

export function getExistingClusterName(): string {
  return process.env[EKS_OPTIONAL_ENV_VARS.EXISTING_CLUSTER_NAME] as string;
}

export function getExistingKubectlLambdaArn(): string {
  return getTrimmedValue(process.env[EKS_OPTIONAL_ENV_VARS.KUBECTL_LAMBDA_ARN]);
}

export function getExistingKubectlOnEventLambdaArn(): string {
  return getTrimmedValue(process.env[EKS_OPTIONAL_ENV_VARS.KUBECTL_ON_EVENT_LAMBDA_ARN]);
}

export function getExistingKubectlLambdaExecutionRoleArn(): string {
  return getTrimmedValue(process.env[EKS_OPTIONAL_ENV_VARS.EXISTING_KUBECTL_LAMBDA_EXECUTION_ROLE_ARN]);
}

export function getCreateK8sOpaResources(): boolean {
  const strVal = process.env[EKS_OPTIONAL_ENV_VARS.CREATE_K8S_OPA_RESOURCES] as string;

  if (!strVal) {
    return false;
  }
  if ("true" === strVal.toLowerCase()) {
    return true;
  }
  return false;
}

export function getPlatformRoleArn(): string {
  return getTrimmedValue(process.env[EKS_ENV_VARS.PLATFORM_ROLE_ARN]);
}

export function getPipelineRoleArn(): string {
  return getTrimmedValue(process.env[EKS_ENV_VARS.PIPELINE_ROLE_ARN]);
}

export function getIsPrivateCluster(): boolean {
  return "private" === process.env[EKS_ENV_VARS.API_ACCESS] as string;
}

export function getApiAllowList(): string[] {
  const strCidrs = process.env[EKS_OPTIONAL_ENV_VARS.API_ACCESS_CIDRS] as string;
  if (!strCidrs) {
    return [];
  }

  return strCidrs.split(",").map(cidr => cidr.trim());
}

export function getClusterAdminRoleArn(): string {
  return getTrimmedValue(process.env[EKS_OPTIONAL_ENV_VARS.CLUSTER_ADMIN_ROLE_ARN]);
}

function getTrimmedValue(value: string | undefined): string {
  let returnVal = value;
  if (returnVal) {
    returnVal = returnVal.replace(/ /g, ''); // remove all whitespace
  }
  return returnVal as string || '';
}

