// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEntity, } from '@backstage/plugin-catalog-react';
import React from 'react';
import { InfoCard, Table, TableColumn } from '@backstage/core-components';
import { Entity } from '@backstage/catalog-model';

interface KeyValue {
  key: string;
  value: string;
}

/** @public */
export interface ProviderInfoProps {
  entity: Entity;
}

const EnvironmentInfo = (props: ProviderInfoProps) => {
  let metadata = props.entity?.metadata || {};
  let spec = props.entity?.spec || {};

  const columns: TableColumn[] = [
    {
      title: 'Key',
      field: 'key',
      highlight: true,
      type: 'string',
      width: '30%',
    },
    {
      title: 'Value',
      field: 'value',
      type: 'string',
    },
  ];

  let items: KeyValue[] = []

  items.push({
    key: "Name",
    value: metadata.name.toString() || ""
  });

  items.push({
    key: "Short Name",
    value: metadata['shortName']?.toString() || ""
  });

  items.push({
    key: "Environment Type",
    value: metadata['environmentType']?.toString() || ""
  });

  items.push({
    key: "Account Type",
    value: metadata['envTypeAccount']?.toString() || ""
  });
  items.push({
    key: "Region Type",
    value: metadata['envTypeRegion']?.toString() || ""
  });
  items.push({
    key: "Category",
    value: metadata['category']?.toString() || ""
  });
  items.push({
    key: "Classification",
    value: metadata['classification']?.toString() || ""
  });
  items.push({
    key: "Level",
    value: metadata['level']?.toString() || ""
  });
  items.push({
    key: "System",
    value: spec['system']?.toString() || ""
  });

  return (
    <InfoCard title="Environment Info">
      <Table
        options={{
          paging: false,
          padding: 'dense',
          search: false,
          showTitle: false,
          header: false,
          filtering: false,
          toolbar: false
        }}
        data={items}
        columns={columns}
      />
    </InfoCard>
  );
};

export const EnvironmentInfoCard = () => {
  const { entity } = useEntity();
  return <EnvironmentInfo entity={entity} />;
};
