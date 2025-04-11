// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Table, TableColumn } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { AWSResource } from '@aws/plugin-aws-apps-common-for-backstage';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle, Grid,
  IconButton, LinearProgress, makeStyles, Typography
} from '@material-ui/core';
import { Close } from '@mui/icons-material';
import React, { useEffect, useState } from 'react';
import { opaApiRef } from '../../api';
import { SecretStringComponent } from '../common';

// Declare styles to use in the components
const useStyles = makeStyles(theme => ({
  container: {
    'min-width': 500,
    'min-height': 150,
  },
  resourceTitle: {
    'font-weight': 'bold',
  },
  closeButton: {
    position: 'absolute',
    right: theme.spacing(1),
    top: theme.spacing(1),
    color: theme.palette.grey[500],
  },
  empty: {
    padding: theme.spacing(2),
    display: 'flex',
    justifyContent: 'center',
  },
}));


/**
 * A Table component for showing AWS Resource details. The table can accommodate varying numbers of columns
 * with corresponding table data
 * @param columns An array of Column descriptors.  See material-table.com/#/docs/all-props for available fields
 * @param tableData An array of data objects to display in the table
 * @param resource The AWS resource type to display its details.  Only SSM Parameters and SecretsManager secrets are supported
 * @returns
 */
const ResourceDetailsTable = ({
  columns,
  tableData,
  resource,
}: {
  columns: TableColumn<{}>[];
  tableData: {}[];
  resource: AWSResource;
}) => {
  const classes = useStyles();

  return (
    <div className={classes.container}>
      <Table
        options={{ paging: false, padding: 'dense', search: false, showTitle: true, header: false, toolbar: false }}
        data={tableData}
        columns={columns}
        title={resource.resourceName}
      />
    </div>
  );
};

/**
 *
 * @param isOpen Boolean describing whether the dialog is displayed (open) or not (closed)
 * @param closeDialogHandler the handler callback when the dialog is closed
 * @param resource The AWS resource type to display its details.  Only SSM Parameters and SecretsManager secrets are supported
 * @returns
 */
export const ResourceDetailsDialog = ({
  isOpen,
  closeDialogHandler,
  resource,
  // prefix,
  // providerName
}: {
  isOpen: boolean;
  closeDialogHandler: () => void;
  resource: AWSResource;
  prefix: string;
  providerName: string;
}) => {
  // Table column definition used for displaying basic key/value pairs
  const kvColumns: TableColumn[] = [
    {
      title: 'Key',
      field: 'key',
      highlight: true,
      type: 'string',
      width: '35%',
    },
    {
      title: 'Value',
      field: 'value',
      type: 'string',
    },
  ];

  // Table column definition for single-values
  const singleColumn: TableColumn[] = [
    {
      title: 'Value',
      field: 'value',
      highlight: false,
      type: 'string',
    },
  ];

  const classes = useStyles();
  const api = useApi(opaApiRef);
  const [loading, setLoading] = useState(true);
  const [_, setError] = useState(false);
  const [tableColumns, setTableColumns] = useState<TableColumn<{}>[]>([{}]);
  const [tableData, setTableData] = useState<{}[]>([{}]);

  // Get the secret details
  async function getData() {

    if (resource.resourceTypeId == 'AWS::SecretsManager::Secret') {
      const secretResponse = await api.getSecret({ secretName: resource.resourceArn });
      const rawSecret = secretResponse.SecretString ?? 'unknown';

      // Process the string differently depending on whether it's a JSON string or not
      try {
        const parsedSecret = JSON.parse(rawSecret);
        setTableColumns(kvColumns);
        const jsonKeys = Object.keys(parsedSecret).sort((a, b) => {
          if (a < b) { return -1; }
          if (a > b) { return 1; }
          return 0;
        });
        const secretTableData = jsonKeys.map((key, i) => {
          const value = /.*password.*/i.test(key) ? (
            <SecretStringComponent secret={parsedSecret[key]} />
          ) : (
            parsedSecret[key]
          );
          return { id: i, key, value };
        });
        setTableData(secretTableData);
      } catch {
        // not a JSON string, so just use the value as-is
        setTableColumns(singleColumn);
        setTableData([{ value: <SecretStringComponent secret={rawSecret} />, id: '1' }]);
      }
    } else if (resource.resourceTypeId == 'AWS::SSM::Parameter') {
      const ssmParamResponse = await api.getSSMParameter({
        ssmParamName: resource.resourceName
      });
      // SSM Parameters are single-value and will only be displayed in a single column table
      setTableColumns(singleColumn);
      const paramValue = ssmParamResponse.Parameter?.Value ?? 'unknown';
      const secretType = ssmParamResponse.Parameter?.Type;
      const secret = secretType == 'SecureString' ? <SecretStringComponent secret={paramValue} /> : paramValue;
      setTableData([{ value: secret, id: '1' }]);
    }
  }

  useEffect(() => {
    getData()
      .then(() => setLoading(false))
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <LinearProgress />;
  }

  // return the JSXElement for the details dialog box
  return (
    <Dialog className={classes.container} open={isOpen} onClose={closeDialogHandler}>
      <DialogTitle id="dialog-title">
        Resource Details
        <IconButton className={classes.closeButton} onClick={closeDialogHandler}>
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Grid container>
          <Grid item>
            <Typography className={classes.resourceTitle}>Name: </Typography>
          </Grid>
          <Grid item>
            <Typography>{resource.resourceName}</Typography>
          </Grid>
        </Grid>
        <ResourceDetailsTable resource={resource} columns={tableColumns} tableData={tableData} />
      </DialogContent>
      <DialogActions>
        <Button color="primary" onClick={closeDialogHandler}>
          Dismiss
        </Button>
      </DialogActions>
    </Dialog>
  );
};

