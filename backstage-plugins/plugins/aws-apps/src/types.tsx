// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { KeyValuePair } from '@aws-sdk/client-ecs';

export interface BAWSAppData {
  [key: string]: any;
}

export interface ContainerDetailsType {
  containerName: string | undefined;
  env: KeyValuePair[] | undefined;
}
