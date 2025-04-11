// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEntity, } from '@backstage/plugin-catalog-react';
import React from 'react';
import { InfoCard, Table, TableColumn } from '@backstage/core-components';
import { Entity } from '@backstage/catalog-model';
import { ProviderType } from '../../helpers/constants';

interface KeyValue {
  key: string;
  value: string;
}

/** @public */
export interface ProviderInfoProps {
  entity: Entity;
}

const ProviderInfo = (props: ProviderInfoProps) => {
  let metadata = props.entity?.metadata || {};

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
    key: "Prefix",
    value: metadata['prefix']?.toString() || ""
  });
  items.push({
    key: "Name",
    value: metadata.name.toString() || ""
  });

  items.push({
    key: "AWS Account",
    value: metadata['awsAccount']?.toString() || ""
  });

  items.push({
    key: "AWS Region",
    value: metadata['awsRegion']?.toString() || ""
  });
  items.push({
    key: "Runtime",
    value: metadata['envType']?.toString() || ""
  });
  items.push({
    key: "Audit Table",
    value: metadata['auditTable']?.toString() || ""
  });
  items.push({
    key: "VPC",
    value: metadata['vpc']?.toString() || ""
  });
  const envType = metadata['envType']?.toString() || "";
  if (envType === ProviderType.ECS || envType === ProviderType.EKS) {
    items.push({
      key: "Cluster Name",
      value: metadata['clusterName']?.toString() || ""
    });
  }
  if (envType === ProviderType.EKS) {
    items.push({
      key: "Node Type",
      value: metadata['nodeType']?.toString() || ""
    });
  }
  items.push({
    key: "Operation Role",
    value: metadata['operationRole']?.toString() || ""
  });
  items.push({
    key: "Provisioning Role",
    value: metadata['provisioningRole']?.toString() || ""
  });
  if (envType === ProviderType.EKS) {
    items.push({
      key: "Cluster Admin Role ARN",
      value: metadata['clusterAdminRole']?.toString() || ""
    });
    items.push({
      key: "API Endpoint Access",
      value: metadata['apiAccess']?.toString() || ""
    });
    items.push({
      key: "Kubectl / Helm Lambda ARN",
      value: metadata['kubectlLambdaArn']?.toString() || ""
    });
    items.push({
      key: "Kubectl / Helm Lambda Role ARN",
      value: metadata['kubectlLambdaAssumeRoleArn']?.toString() || ""
    });
  }

  return (
    <InfoCard title="Provider Info">
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

export const ProviderInfoCard = () => {
  const { entity } = useEntity();
  return <ProviderInfo entity={entity} />;
};
