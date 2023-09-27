// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AssociatedResources, ResourceBinding } from '@aws/plugin-aws-apps-common-for-backstage';
import { CatalogApi } from '@backstage/plugin-catalog-react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle, Grid,
  IconButton, makeStyles, Radio, Table, TableBody, TableCell, TableHead, TableRow
} from '@material-ui/core';
import { Close } from '@mui/icons-material';
import React, { useEffect, useState } from 'react';

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
 * A Table component for showing AWS Resources. The table can accommodate varying numbers of columns
 * with corresponding table data
 * @param columns An array of Column descriptors.  See material-table.com/#/docs/all-props for available fields
 * @param tableData An array of data objects to display in the table
 * @param resource The AWS resource type to display its details.  Only SSM Parameters and SecretsManager secrets are supported
 * @returns
 */
const ResourceSelectorTable = ({
  tableData,
  selectedRowCallback
}: {
  tableData: ResourceBinding[];
  selectedRowCallback: (item: ResourceBinding) => void;
}) => {
  /*const classes = */ useStyles();
  const [selectedRadio, setSelectedRadio] = useState<number>();

  const selectedRow = (item: ResourceBinding, index: number) => {
    selectedRowCallback(item)
    setSelectedRadio(index)
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Select</TableCell>
          <TableCell>Resource Name</TableCell>
          <TableCell> Resource Type </TableCell>
          <TableCell> Provider </TableCell>
          <TableCell>Arn</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>

        {tableData.map((row, index) => (
          <TableRow key={index}>
            <TableCell scope="row">
              <Radio value={index} checked={index != selectedRadio ? false : true} radioGroup='resourceGroup' onChange={() => selectedRow(row, index)} />
            </TableCell>
            <TableCell>{row.resourceName}</TableCell>
            <TableCell>{row.resourceType}</TableCell>
            <TableCell>{row.provider}</TableCell>
            <TableCell>{row.resourceArn}</TableCell>
          </TableRow>
        ))}

      </TableBody>
    </Table>
  );
};

/**
 *
 * @param isOpen Boolean describing whether the dialog is displayed (open) or not (closed)
 * @param closeDialogHandler the handler callback when the dialog is closed
 * @param resource The AWS resource type to display its details.  Only SSM Parameters and SecretsManager secrets are supported
 * @returns
 */
export const ResourceSelectorDialog = ({
  isOpen,
  closeDialogHandler,
  selectHandler,
  catalog,
  currentEnvironment,
  associatedResources
}: {
  isOpen: boolean;
  closeDialogHandler: () => void;
  selectHandler: (item: ResourceBinding) => void;
  catalog: CatalogApi;
  currentEnvironment: string;
  associatedResources: ResourceBinding[];
}) => {


  const classes = useStyles();
  // @ts-ignore
  const [loading, setLoading] = useState(true);
  // @ts-ignore
  const [error, setError] = useState(false);
  const [tableData, setTableData] = useState<ResourceBinding[]>([]);
  const [selectedResource, setSelectedResource] = useState<ResourceBinding>();

  const localSelectHandler = () => {
    // if there's a selected value - rely the item to the external caller
    if (selectedResource) {
      selectHandler(selectedResource);
    }
    closeDialogHandler();
  }

  const rowSelectedHandler = (item: ResourceBinding) => {
    setSelectedResource(item)
  }

  const isResourceAlreadyBind = (resourceArn: string, associatedResources: ResourceBinding[]) => {
    let result: boolean = false
    associatedResources.forEach(r => {
      if (r.resourceArn === resourceArn) {
        result = true;
      }
    })
    return result
  }

  async function getData() {
    const tableData: ResourceBinding[] = []

    // search the catalog for resources within the same environment and provider
    const allResources = await catalog.getEntities({ filter: { 'kind': "resource", 'spec.type': 'aws-resource' } });

    const matchedResources = allResources.items.filter(entity => {
      const appData = entity.metadata["appData"] as any;
      return appData && appData[currentEnvironment] && entity.metadata.name
    })

    matchedResources.forEach(et => {
      const appData = et.metadata["appData"] as any;
      const envAppData = appData[currentEnvironment] as any;
      // find all providers - for multi providers
      const providers = Object.keys(envAppData)
      providers.forEach(p => {
        const providerAppData = envAppData[p] as any;
        if (isResourceAlreadyBind(providerAppData['Arn'], associatedResources)) {
          return;
        }
        if (et.metadata['resource-type'] === "aws-rds") {
          //Handler for aws-rds with associated resources
          const associatedRDSResources: AssociatedResources =
          {
            resourceArn: providerAppData['DbAdminSecretArn'],
            resourceType: "aws-db-secret",
            resourceName: `${et.metadata.name}-secret`
          }

          tableData.push(
            {
              resourceName: et.metadata.name,
              resourceType: et.metadata['resource-type']?.toString() || "",
              provider: p,
              resourceArn: providerAppData['Arn'],
              id: `resource:default/${et.metadata.name}`,
              associatedResources: [associatedRDSResources]
            })
        }
        else if (et.metadata['resource-type'] === "aws-s3") {
          // Custom S3 bucket resource handler - add resource policy 
        }
        else {
          // General AWS resource handler
          tableData.push(
            {
              resourceName: et.metadata.name,
              resourceType: et.metadata['resource-type']?.toString() || "",
              provider: p,
              resourceArn: providerAppData['Arn'],
              id: `resource:default/${et.metadata.name}`,
            })
        }
      })
    })
    setTableData(tableData)
  }

  useEffect(() => {
    getData()
      .then(() => setLoading(false))
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [associatedResources]);

  // return the JSXElement for the details dialog box
  return (
    <Dialog className={classes.container} open={isOpen} onClose={closeDialogHandler} maxWidth="lg">
      <DialogTitle id="dialog-title">
        Available Resources
        <IconButton className={classes.closeButton} onClick={closeDialogHandler}>
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Grid container>
          <ResourceSelectorTable selectedRowCallback={rowSelectedHandler} tableData={tableData} />
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button color="primary" onClick={localSelectHandler}>
          Select
        </Button>
        <Button color="primary" onClick={closeDialogHandler}>
          Dismiss
        </Button>
      </DialogActions>
    </Dialog>
  );
};

