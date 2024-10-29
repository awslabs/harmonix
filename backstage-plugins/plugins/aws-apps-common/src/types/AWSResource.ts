// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * @public
 */
export interface AWSResource {
  resourceTypeId: string;
  resourceTypeName: string;
  resourceName: string;
  resourceArn: string;
}

/** @public */
export interface AuditRecord {
  id: string;
  origin: string;
  actionType: string;
  actionName: string;
  appName: string;
  createdDate: string;
  createdAt: string;
  initiatedBy: string;
  owner: string;
  assumedRole: string;
  targetAccount: string;
  targetRegion: string;
  prefix: string;
  providerName: string;
  request: string;
  status: string;
  message: string;
}

/** @public */
export interface ResourceBinding {
  id: string;
  resourceType: string;
  resourceName: string;
  provider: string;
  resourceArn: string;
  associatedResources?: AssociatedResources[];
  entityRef?: string;
}

/** @public */
export interface AssociatedResources {
  resourceName: string;
  resourceType: string;
  resourceArn: string;
}

/** @public */
export interface BindResourceParams {
  envName: string;
  providerName: string;
  resourceName: string;
  resourceEntityRef: string;
  policies: ResourcePolicy[];
  appName: string;
}

/** @public */
export interface ResourcePolicy {
  policyFileName: string;
  policyContent: string;
  policyResource: string;
}
