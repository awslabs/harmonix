// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  Entity,
  getCompoundEntityRef,
  parseEntityRef,
  RELATION_OWNED_BY,
  RELATION_OWNER_OF,
} from '@backstage/catalog-model';
import { CatalogProcessor, CatalogProcessorEmit, processingResult } from '@backstage/plugin-catalog-node';
import { LocationSpec } from '@backstage/plugin-catalog-common';
import { AWSEnvironmentProviderEntityV1, awsEnvironmentProviderEntityV1Validator } from '@aws/plugin-aws-apps-common-for-backstage';


/** @public */
export class AWSEnvironmentProviderEntitiesProcessor implements CatalogProcessor {
  getProcessorName(): string {
    return 'AWSEnvironmentProviderEntitiesProcessor';
  }

  private readonly validators = [awsEnvironmentProviderEntityV1Validator];

  async validateEntityKind(entity: Entity): Promise<boolean> {
    for (const validator of this.validators) {
      if (entity.kind === 'AWSEnvironmentProvider')
        if (await validator.check(entity)) {
          return true;
        }
    }

    return false;
  }

  async postProcessEntity(entity: Entity, _location: LocationSpec, emit: CatalogProcessorEmit): Promise<Entity> {
    const selfRef = getCompoundEntityRef(entity);

    if (entity.apiVersion === 'aws.backstage.io/v1alpha' && entity.kind === 'AWSEnvironmentProvider') {
      const template = entity as AWSEnvironmentProviderEntityV1;

      const target = template.spec.owner;
      if (target) {
        const targetRef = parseEntityRef(target, {
          defaultKind: 'Group',
          defaultNamespace: selfRef.namespace,
        });
        emit(
          processingResult.relation({
            source: selfRef,
            type: RELATION_OWNED_BY,
            target: {
              kind: targetRef.kind,
              namespace: targetRef.namespace,
              name: targetRef.name,
            },
          }),
        );
        emit(
          processingResult.relation({
            source: {
              kind: targetRef.kind,
              namespace: targetRef.namespace,
              name: targetRef.name,
            },
            type: RELATION_OWNER_OF,
            target: selfRef,
          }),
        );
      }
    }

    return entity;
  }
}
