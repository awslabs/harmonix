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