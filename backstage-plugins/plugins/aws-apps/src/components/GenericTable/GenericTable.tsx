// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { TableColumn, Table } from '@backstage/core-components';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(theme => ({
  container: {
    width: 850,
  },
  empty: {
    padding: theme.spacing(2),
    display: 'flex',
    justifyContent: 'center',
  },
}));

interface GenericTableProps {
  object: Record<string, string>;
  title: string;
}

export const GenericTable = ({ object, title }: GenericTableProps) => {
  const columns: TableColumn[] = [
    {
      title: 'Name',
      field: 'name',
      highlight: true,
    },
    { title: 'Value', field: 'value' },
  ];
  const [data, updateData] = useState<Array<{}>>([]);
  const classes = useStyles();
  useEffect(() => {
    // console.log(object)
    if (object) {
      updateData(
        Object.entries(object).map(([key, value]) => ({
          name: key,
          value,
        })),
      );
    }
  }, [object]);

  return (
    <Table
      title={title}
      columns={columns}
      data={data}
      options={{ padding: 'dense' }}
      emptyContent={<div className={classes.empty}>No data,&nbsp;</div>}
    />
  );
};
