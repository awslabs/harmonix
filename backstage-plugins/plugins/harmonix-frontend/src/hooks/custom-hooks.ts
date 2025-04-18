// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Entity } from '@backstage/catalog-model';

export function useLabelsFromEntity(entity: Entity): Record<string, string> {
  const labels = entity?.metadata?.labels ?? {};

  return labels;
}

export function useAnnotationsFromEntity(entity: Entity): Record<string, string> {
  const annotations = entity?.metadata?.annotations ?? {};

  return annotations;
}
