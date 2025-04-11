// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AWSEnvironmentProviderRecord } from '@aws/plugin-aws-apps-common-for-backstage';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle, Grid,
  IconButton, InputLabel, MenuItem, makeStyles
} from '@material-ui/core';
import { Close } from '@mui/icons-material';
import React, { useEffect, useState } from 'react';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
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
 *
 * @param isOpen Boolean describing whether the dialog is displayed (open) or not (closed)
 * @param closeDialogHandler the handler callback when the dialog is closed
 * @param resource The AWS resource type to display its details.  Only SSM Parameters and SecretsManager secrets are supported
 * @returns
 */
export const AwsEnvironmentProviderSelectorDialog = ({
  isOpen,
  closeDialogHandler,
  selectHandler,
  providersInput
}: {
  isOpen: boolean;
  closeDialogHandler: () => void;
  selectHandler: (item: AWSEnvironmentProviderRecord) => void;
  providersInput: AWSEnvironmentProviderRecord[];
}) => {

  const classes = useStyles();
  const [selectedProvider, setSelectedProvider] = useState<AWSEnvironmentProviderRecord>();

  const handleChangeSelectedProvider = (event: SelectChangeEvent) => {
    const selectedProvider = event.target.value as string;
    const matchingProviders = providersInput.filter(providerRecord => {
      return selectedProvider === `${providerRecord.prefix}:${providerRecord.name}`
    });

    if (matchingProviders.length != 1) {
      console.error(`Failed to find provider matching ${selectedProvider}`);
    } else {
      setSelectedProvider(matchingProviders[0]);
    }
  };

  const localSelectHandler = () => {
    // if there's a selected value - rely the item to the external caller
    if (selectedProvider) {
      selectHandler(selectedProvider);
    }
    closeDialogHandler();
  }

  if (!selectedProvider && providersInput.length > 0) {
    setSelectedProvider(providersInput[0])
  }

  const selectorProviders = providersInput.map(p => {
    const key = `${p.prefix}:${p.name}`;
    const title = `${p.prefix}:${p.name}`;
    return (<MenuItem key={key} value={key}>{title}</MenuItem>)
  });

  const getSelectedProvider = () => {
    if (selectedProvider) {
      return `${selectedProvider?.prefix}:${selectedProvider?.name}`;
    }
    else {
      return
    }
  }

  useEffect(() => {

  }, []);

  return (
    <Dialog className={classes.container} open={isOpen} onClose={closeDialogHandler} disableEnforceFocus>
      <DialogTitle id="dialog-title">
        Available Providers
        <IconButton className={classes.closeButton} onClick={closeDialogHandler}>
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Grid container>
          <FormControl fullWidth sx={{ m: 2 }}>
            <InputLabel id="lbl-select-aws-environment">Providers</InputLabel>
            <Select sx={{ width: 300 }}
              labelId="select-aws-environment-provider"
              id="select-aws-environment-provider"
              value={getSelectedProvider()}
              label="Environments"
              onChange={handleChangeSelectedProvider}
            >
              {selectorProviders}
            </Select>
          </FormControl>
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

