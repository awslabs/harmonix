// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AWSEnvironmentEntityV1,  } from "../entities/AWSEnvironmentEntityV1";
import { AWSEnvironmentProviderEntityV1 } from "../entities/AWSEnvironmentProviderEntityV1"
import { DeployStackStatus } from "@aws/plugin-aws-apps-for-backstage/src/helpers/constants";
import { IRepositoryInfo } from "./SCMBackendAPI";

/** 
 * A type for interacting with OPA Backend environments
 * @public
*/
export type BackendParams = {
  awsAccount: string;
  awsRegion: string;
  prefix: string;
  providerName: string;
  appName: string;
};


// Create providers definition for the different providers types: eks, ecs, and serverless
export type GenericAWSEnvironment = AWSDeploymentEnvironment | AWSECSAppDeploymentEnvironment | AWSEKSAppDeploymentEnvironment
  | AWSServerlessAppDeploymentEnvironment | AWSResourceDeploymentEnvironment  // the key is the environment name (in all lower case)

// ---------------------------------------------------------------- AWS Environment types below -------------------------------
/** 
 * A collection(map) of associated environments of an AWS App or Resource
 * @public
*/
export type AwsDeploymentEnvironments = {
  [key: string]: GenericAWSEnvironment
}

export type AWSDeploymentEnvironmentComponent = {
  cloudFormationStackName: string;
  links: { title: string, url: string, icon?: string }[];
}

/** 
 * A single provider map for an AWS Component
 * @public
*/
export type AWSDeploymentEnvironment = {
  providerData: {
    name: string;
    prefix: string;
    description: string;
    accountNumber: string;
    region: string;
    vpcSsmKey: string;
    providerType: string;  // ecs/eks/serverless/ TBD
    auditTable: string;
    operationRoleSsmKey: string;
    provisioningRoleSsmKey: string;
    cloudFormationStackName: string;
    terraformWorkspace: string;
    terraformStateBucket: string;
    terraformStateTable: string;

  };
  environment: {
    name: string;
    description: string;
    accountType: string;
    regionType: string;
    category: string;
    classification: string;
    envType: string;
    level: number;
  };
  entities: {
    envEntity?: AWSEnvironmentEntityV1;
    envProviderEntity?: AWSEnvironmentProviderEntityV1;
  };
  app: AWSDeploymentEnvironmentComponent;
  resource: {}
}

export function isAWSECSAppDeploymentEnvironment(variable: any): variable is AWSECSAppDeploymentEnvironment {
  return (
    !!variable &&
    typeof variable === "object" &&
    "clusterName" in variable &&
    "app" in variable &&
    "ecrArn" in variable.app &&
    "serviceArn" in variable.app &&
    "taskDefArn" in variable.app &&
    "taskExecutionRoleArn" in variable.app &&
    "resourceGroupArn" in variable.app &&
    "logGroupName" in variable.app
  );
}

export type AWSECSAppDeploymentEnvironment = AWSDeploymentEnvironment & {
  clusterName: string;
  app: AWSDeploymentEnvironmentComponent & {
    ecrArn: string;
    serviceArn: string;
    taskDefArn: string;
    taskExecutionRoleArn: string;
    resourceGroupArn: string;
    logGroupName: string;
  }
}

export function isAWSEKSAppDeploymentEnvironment(variable: any): variable is AWSEKSAppDeploymentEnvironment {
  return (
    !!variable &&
    typeof variable === "object" &&
    "clusterName" in variable &&
    "app" in variable &&
    "ecrArn" in variable.app &&
    "namespace" in variable.app &&
    "resourceGroupArn" in variable.app &&
    "logGroupName" in variable.app
  );
}

export type AWSEKSAppDeploymentEnvironment = AWSDeploymentEnvironment & {
  clusterName: string;
  app: AWSDeploymentEnvironmentComponent & {
    appAdminRoleArn: string;
    ecrArn: string;
    namespace: string;
    resourceGroupArn: string;
    logGroupName: string;
  }
}

/** 
 * CloudFormation stack data
 * @public
*/
export type CloudFormationStack = {
  stackDeployStatus: DeployStackStatus;
  stackName: string;
  creationTime?: string;
  lastUpdatedTime?: string;
}

export function isAWSServerlessAppDeploymentEnvironment(variable: any): variable is AWSServerlessAppDeploymentEnvironment {
  return (
    !!variable &&
    typeof variable === "object" &&
    "app" in variable &&
    "appStack" in variable.app &&
    "resourceGroupArn" in variable.app &&
    "logGroupNames" in variable.app
  );
}

export type AWSServerlessAppDeploymentEnvironment = AWSDeploymentEnvironment & {
  app: {
    appStack: CloudFormationStack; // non-IaC stack that defines serverless resources like lambdas
    s3BucketName?: string; // name of S3 bucket that holds CICD build artifacts for use in deployment
    resourceGroupArn: string;
    logGroupNames: string[];
  }
}

// capture an AWS resource withing a particular AWS Provider
export type AWSResourceDeploymentEnvironment = AWSDeploymentEnvironment & {
  resource: {
    arn: string;
    resourceName: string;
    resourceType: string;
    resourceGroupArn: string;
    cloudFormationStackName: string;
  }
}


export enum ComponentStateType {
  CLOUDFORMATION = "cloudformation",
  TERRAFORM_CLOUD = "terraform-cloud",
  TERRAFORM_AWS = "terraform-aws"
}


export enum AWSComponentType {
  AWSApp = "aws-app",
  AWSResource = "aws-resource",
  AWSOrganization = "aws-organization",
  AWSProvider = "aws-provider",
  AWSEnvironment = "aws-environment",
  Default = "aws-default"
}

// ---------------------------------------------------------------- AWS Apps/Resources types below -------------------------------
/** 
 * A Generic AWS Component can be an AWS Artifact such as App, Resource, Organization
 * @public
*/
export type AWSComponent = {
  componentName: string;
  componentType: AWSComponentType;
  componentSubType: string;
  iacType: string;
  componentState: ComponentStateType;
  repoSecretArn: string;
  platformRegion: string;
  environments: AwsDeploymentEnvironments;     // map of all the deployed environment
  currentEnvironment: GenericAWSEnvironment;   // selected current environment provider 
  setCurrentProvider: (envName: string, providerName: string) => void;
  getRepoInfo: () => IRepositoryInfo;
}


export type AWSEnvironmentProviderRecord = {
  id: string;
  name: string;
  prefix: string;
  providerType: string;
  description: string;
  accountNumber: string;
  region: string;
}

export enum AppStateType {
  RUNNING = "Running",
  STOPPED = "Stopped",
  UPDATING = "Updating",
  PROVISIONING = "Provisioning"
}

export type AppState = {
  appID?: string;
  appState?: AppStateType
  deploymentIdentifier?: string;
  runningCount?: number;
  desiredCount?: number;
  pendingCount?: number;
  lastStateTimestamp?: Date;
  stateObject?: any;
  additionalInfo?: KeyValue[];
}

export interface KeyValue {
  id: string;
  key: string;
  value: string;
}

export interface KeyValueDouble {
  id: string;
  key: string;
  value: string;
  key2: string;
  value2: string;
}

