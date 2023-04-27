// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { EmptyState, Table, TableColumn } from '@backstage/core-components';
import { useEntity } from '@backstage/plugin-catalog-react';
import { LinearProgress } from '@material-ui/core';
import { useApi } from '@backstage/core-plugin-api';
import { AuditRecord, bawsApiRef } from '../../api';
import { Typography } from '@mui/material';
import { useAsyncAwsApp } from '../../hooks/useAwsApp';

const AuditTable = ({
  input: { account, region, appName },
}: {
  input: { account: string; region: string; appName: string };
}) => {
  const bawsApi = useApi(bawsApiRef);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ isError: boolean; errorMsg: string | null }>({ isError: false, errorMsg: null });
  const [items, setItems] = useState<AuditRecord[]>([]);

  useEffect(() => {
    getAuditDetails(account, region)
      .then(results => {
        setLoading(false);
        if (results.Count! > 0 && results.Items) {
          const items = results.Items.map(item => {
            console.log(item);
            const auditRecord: AuditRecord = {
              id: item['id'].S || '',
              origin: item['origin'].S || '',
              actionType: item['actionType'].S || '',
              name: item['name'].S || '',
              createdDate: item['createdDate'].S || '',
              createdAt: item['createdAt'].S || '',
              initiatedBy: item['initiatedBy'].S || '',
              owner: item['owner'].S || '',
              assumedRole: item['assumedRole'].S || '',
              targetAccount: item['targetAccount'].S || '',
              targetRegion: item['targetRegion'].S || '',
              request: item['request'].S || '',
              status: item['status'].S || '',
              message: item['message'].S || '',
            };

            return auditRecord;
          });
          setItems(items);
          setError({ isError: false, errorMsg: '' });
        }
      })
      .catch(err => {
        setLoading(false);
        setError({ isError: true, errorMsg: `Unexpected error occurred while retrieving audit data: ${err}` });
      });
  }, []);

  async function getAuditDetails(awsAccount: string, awsRegion: string) {
    // console.log(region, account)
    return await bawsApi.getAuditDetails({
      appName: appName,
      account: awsAccount,
      region: awsRegion,
    });
  }

  const columns: TableColumn[] = [
    {
      title: 'Record ID',
      field: 'id',
      highlight: true,
    },
    {
      title: 'Origin',
      field: 'origin',
    },
    {
      title: 'Action Type',
      field: 'actionType',
    },
    {
      title: 'Name',
      field: 'name',
    },
    {
      title: 'Create Date',
      field: 'createdDate',
      type: 'date',
    },
    {
      title: 'Create At',
      field: 'createdAt',
    },
    {
      title: 'Initiated By',
      field: 'initiatedBy',
    },
    {
      title: 'Owner',
      field: 'owner',
    },
    {
      title: 'Assumed Role',
      field: 'assumedRole',
    },
    {
      title: 'Target Account',
      field: 'targetAccount',
    },
    {
      title: 'Target Region',
      field: 'targetRegion',
    },
    {
      title: 'Request',
      field: 'request',
    },
    {
      title: 'Status',
      field: 'status',
    },
    {
      title: 'Message',
      field: 'message',
    },
  ];
  if (error.isError) {
    return <Typography sx={{ color: 'red' }}>{error.errorMsg}</Typography>;
  }

  return (
    <div>
      <Table options={{ paging: true }} data={items} columns={columns} title="Audit Table" isLoading={loading} />
    </div>
  );
};

export const AuditWidget = () => {
  const { entity } = useEntity();
  const awsAppLoadingStatus = useAsyncAwsApp();

  if (awsAppLoadingStatus.loading) {
    return <LinearProgress />;
  } else if (awsAppLoadingStatus.deployments) {
    const env1 = awsAppLoadingStatus.deployments
      .environments[Object.keys(awsAppLoadingStatus.deployments.environments)[0]];
    const input = {
      appName: entity.metadata.name,
      account: env1.accountNumber,
      region: env1.region,
    };
    return <AuditTable input={input} />;
  } else {
    return <EmptyState missing="data" title="No audit data to show" description="Audit data would show here" />;
  }
};
