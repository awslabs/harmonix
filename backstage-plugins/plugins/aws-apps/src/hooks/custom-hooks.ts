// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Entity } from '@backstage/catalog-model';

export function useLabelsFromEntity(entity: Entity): Record<string, string> {
  return entity?.metadata?.labels ?? {};
}

export function useAnnotationsFromEntity(
  entity: Entity,
): Record<string, string> {
  return entity?.metadata?.annotations ?? {};
}
