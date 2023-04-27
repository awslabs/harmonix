// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { BAWSAppData } from '../types';


import { Entity } from '@backstage/catalog-model';

export function useAppFromEntity(entity: Entity): BAWSAppData {
  const appData = (entity.metadata.annotations as BAWSAppData) ?? '';
  // ToDo Validate entity as AWS Entity, has proper data (i.e repo, association with env etc.)

  return appData;
}
