// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { StackStatus } from "@aws-sdk/client-cloudformation";

export enum ExtraStackDeployStatus {
  STAGED = "STAGED",
  UNSTAGED = "UNSTAGED"
}

export enum ProviderType {
  ECS = "ecs",
  EKS = "eks",
  SERVERLESS = "serverless"
}

export type DeployStackStatus = StackStatus | ExtraStackDeployStatus;

export enum APP_SUBTYPE {
  ECS = 'ecs',
  SERVERLESS_REST_API = 'serverless-rest-api',
}

export enum HTTP {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
  OPTIONS = 'OPTIONS',
  HEAD = 'HEAD',
}
