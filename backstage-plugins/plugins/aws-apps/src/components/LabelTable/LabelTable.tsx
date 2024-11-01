// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { EmptyState } from '@backstage/core-components';
import { GenericTable } from '../GenericTable/GenericTable';
import { useEntity } from '@backstage/plugin-catalog-react';
import { useLabelsFromEntity } from '../../hooks/custom-hooks';
import { isLabelsAvailable } from '../../plugin';
import { Entity } from '@backstage/catalog-model';

const LabelTable = ({ entity }: { entity: Entity }) => {
  const labels = useLabelsFromEntity(entity);

  return <GenericTable title="Labels Table" object={labels} />;
};

export const LabelWidget = () => {
  const { entity } = useEntity();
  return !isLabelsAvailable(entity) ? (
    <EmptyState
      missing="data"
      title="No Labels to show"
      description="Labels would show here"
    />
  ) : (
    <LabelTable entity={entity} />
  );
};
