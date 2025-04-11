// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle, Grid,
  IconButton, InputLabel, MenuItem, Select, TextField, makeStyles
} from '@material-ui/core';
import { Close } from '@mui/icons-material';
import React, { useState } from 'react';
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
 * @param closeDialogHandler the handler callback when the dialog is dismissed/cancelled
 * @param submitHandler the handler callback when the dialog is submitted
 * @param environmentName the name of the environment that will be added to the app's CICD pipeline
 * @namespaceDefault suggestions on what the user could enter for a namespace
 * @iamRoleArnDefault suggestions on what the user could enter for the IAM role ARN
 * @returns
 */
export const AwsEksEnvPromoDialog = ({
  isOpen,
  closeDialogHandler,
  submitHandler,
  environmentName,
  namespaceDefault,
  iamRoleArnDefault,
}: {
  isOpen: boolean;
  closeDialogHandler: () => void;
  submitHandler: (namespace: string, iamRoleArn: string, roleBehavior: string) => void;
  environmentName: string;
  namespaceDefault: string;
  iamRoleArnDefault: string;
}) => {

  const classes = useStyles();

  const [namespace, setNamespace] = useState<string>("");
  const [namespaceIsInvalid, setNamespaceIsInvalid] = useState(false);
  const [namespaceDescription, setNamespaceDescription] = useState<string>(`The k8s namespace to assign to application resources for the ${environmentName} environment`);

  const [iamRoleArn, setIamRoleArn] = useState<string>("");
  const [iamRoleArnIsInvalid, setIamRoleArnIsInvalid] = useState(false);
  const [iamRoleArnDescription, setIamRoleArnDescription] = useState<string>("Existing IAM role to grant namespace privileges to");

  const [roleBehavior, setRoleBehavior] = useState<string>("create_new_k8s_namespace_admin_iam_role");

  const submitNewEnvironmentHandler = () => {
    if (roleBehavior === 'existing_new_k8s_namespace_admin_iam_role' && !iamRoleArn) {
      checkIamRoleArn();
      return;
    }
    if (namespaceIsInvalid || (iamRoleArnIsInvalid && roleBehavior === 'existing_new_k8s_namespace_admin_iam_role')) {
      return;
    }
    closeDialogHandler();
    submitHandler(namespace as string, iamRoleArn as string, roleBehavior as string);
  };

  const checkNamespace = () => {
    if (!namespace) {
      setNamespaceDescription("Cannot be Empty");
      setNamespaceIsInvalid(true);
    } else {
      setNamespaceDescription(`The k8s namespace to assign to application resources for the ${environmentName} environment`);
      setNamespaceIsInvalid(false);
    }
  };

  const checkIamRoleArn = () => {
    if (!iamRoleArn) {
      setIamRoleArnDescription("Cannot be Empty");
      setIamRoleArnIsInvalid(true);
    } else {
      setIamRoleArnDescription("Existing IAM role to grant namespace privileges to");
      setIamRoleArnIsInvalid(false);
    }
  };

  return (
    <Dialog className={classes.container} open={isOpen} onClose={closeDialogHandler} fullWidth maxWidth='md' disableEnforceFocus>
      <DialogTitle id="dialog-title">
        Add Environment: {environmentName}
        <IconButton className={classes.closeButton} onClick={closeDialogHandler}>
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Grid container>
          <FormControl fullWidth sx={{ m: 2 }}>
            <InputLabel id="lbl-namespace-entry">K8s Namespace</InputLabel>
            <TextField
              id={`namespace-entry`}
              size="medium"
              fullWidth
              value={namespace}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNamespace(e.target.value)}
              onBlur={() => checkNamespace()}
              error={namespaceIsInvalid}
              helperText={namespaceDescription}
              placeholder={namespaceDefault}
              required
              autoFocus
            ></TextField>
          </FormControl>
        </Grid>
        <Grid container>
          <FormControl fullWidth sx={{ m: 2 }}>
            <InputLabel id="select-role-behavior-label">Namespace-bound Kubectl Admin Access</InputLabel>
            <Select
              labelId="select-role-behavior-label"
              id="select-role-behavior"
              value={roleBehavior}
              label="Role Behavior"
              onChange={(e: React.ChangeEvent<{
                name?: string | undefined;
                value: unknown;
              }>) => setRoleBehavior(e.target.value as string)}
            >
              <MenuItem value="create_new_k8s_namespace_admin_iam_role">Create a separate role for the K8s namespace</MenuItem>
              <MenuItem value="existing_new_k8s_namespace_admin_iam_role">Import existing role and grant it access to the K8s namespace</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        {roleBehavior === 'existing_new_k8s_namespace_admin_iam_role' &&
          <Grid container>
            <FormControl fullWidth sx={{ m: 2 }}>
              <InputLabel id="lbl-iam-role-arn-entry">IAM Role</InputLabel>
              <TextField
                id={`iam-role-arn-entry`}
                size="medium"
                fullWidth
                value={iamRoleArn}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIamRoleArn(e.target.value)}
                onBlur={() => checkIamRoleArn()}
                error={iamRoleArnIsInvalid}
                helperText={iamRoleArnDescription}
                placeholder={iamRoleArnDefault}
                required
              ></TextField>
            </FormControl>
          </Grid>
        }
      </DialogContent>
      <DialogActions>
        <Button color="primary" onClick={submitNewEnvironmentHandler}>
          Add Environment
        </Button>
        <Button color="primary" onClick={closeDialogHandler}>
          Dismiss
        </Button>
      </DialogActions>
    </Dialog>
  );
};

