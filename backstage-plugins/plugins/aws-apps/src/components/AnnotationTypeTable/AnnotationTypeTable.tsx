// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { EmptyState } from '@backstage/core-components';
import { GenericTable } from '../GenericTable/GenericTable';
import { useEntity } from '@backstage/plugin-catalog-react';
import { useAnnotationsFromEntity } from '../../hooks/custom-hooks';
import { isAnnotationsAvailable } from '../../plugin';
import { Entity } from '@backstage/catalog-model';

const AnnotationTypeTable = ({
  entity,
  type,
}: {
  entity: Entity;
  type: string;
}) => {
  const initAnnotations = { ...useAnnotationsFromEntity(entity) };

  Object.keys(initAnnotations).forEach(key => {
    // If the annotation is of the correct type, keep it
    if (key.includes(type)) {
      // Separate out Annotation
      let newKey = key.replace(`${type}/`, '').replace(/-/g, ' ');
      // Capital case the annotation
      newKey = newKey
        .split(' ')
        .map(s => s.charAt(0).toUpperCase() + s.substring(1))
        .join(' ');
      initAnnotations[newKey] = initAnnotations[key];
    }
    delete initAnnotations[key];
  });

  return (
    <GenericTable
      title={`Annotations Table (${type})`}
      object={initAnnotations}
    />
  );
};

export const AnnotationWidget = ({ type }: { type: string }) => {
  const { entity } = useEntity();
  return !isAnnotationsAvailable(entity) ? (
    <EmptyState
      missing="data"
      title="No Annotations to show"
      description="Annotations would show here"
    />
  ) : (
    <AnnotationTypeTable type={type} entity={entity} />
  );
};
