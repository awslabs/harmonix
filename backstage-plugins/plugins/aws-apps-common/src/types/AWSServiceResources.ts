// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AWSResource } from './AWSResource';

/**
 * @public
 */
export interface AWSServiceResources {
  [k: string]: Array<AWSResource>;
}
