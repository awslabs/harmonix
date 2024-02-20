// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Entity } from "@backstage/catalog-model";
import { InfoCard } from "@backstage/core-components";
import { useApi } from "@backstage/core-plugin-api";
import { CatalogApi, catalogApiRef, useEntity } from "@backstage/plugin-catalog-react";
import { Button, CardContent, Grid } from "@material-ui/core";
import { Alert, AlertTitle, Typography } from "@mui/material";
import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';
import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { OPAApi, opaApiRef } from '../../api';
import { sleep } from "../../helpers/util";

const DeleteEnvironmentPanel = ({
  input: { entity, catalogApi, api }
}: { input: { entity: Entity; catalogApi: CatalogApi; api: OPAApi } }) => {
  const [spinning, setSpinning] = useState(false);
  const [isDeleteSuccessful, setIsDeleteSuccessful] = useState(false);
  const [deleteResultMessage, setDeleteResultMessage] = useState("");

  const navigate = useNavigate();

  const handleCloseAlert = () => {
    setDeleteResultMessage("");
  };

  const [disabled, setDisabled] = useState(false);

  const deleteRepo = () => {
    const gitHost = entity.metadata['repoUrl'] ? entity.metadata['repoUrl'].toString().split("?")[0] : "";
    const gitRepoName = entity.metadata.repoUrl?.toString().split('repo=')[1].toLowerCase() || "";
    api.deleteRepository({
      gitHost,
      gitProject: 'aws-environments',
      gitRepoName,
      gitAdminSecret: 'opa-admin-gitlab-secrets'
    }).then(results => {
      console.log(results);
      setDeleteResultMessage("Gitlab Repository deleted.")
      setIsDeleteSuccessful(true)
    }).catch(error => {
      console.log(error)
      setDeleteResultMessage(`Error deleting Repository ${error}.`)
      setSpinning(false);
      setIsDeleteSuccessful(false)
    })
  }

  const deleteFromCatalog = async () => {
    console.log("Deleting entity from backstage catalog")
    setDeleteResultMessage("Deleting entity from backstage catalog")
    // The entity will be removed from the catalog along with the auto-generated Location kind entity
    // which references the catalog entity
    const uid = entity.metadata.uid || "";
    const entityAnnotations = entity.metadata.annotations || {};
    const entityLocation = entityAnnotations["backstage.io/managed-by-location"] || "";
    const entityLocationRef = await catalogApi.getLocationByRef(entityLocation);
    if (entityLocationRef) {
      catalogApi.removeLocationById(entityLocationRef.id);
    }
    catalogApi.removeEntityByUid(uid);

  }

  const isExistingComponents = () => {
    let result: boolean = false
    entity.relations?.forEach(et => {
      if (et.targetRef.startsWith("component") || et.targetRef.startsWith("resource") || et.targetRef.startsWith("awsenvironmentprovider")) {
        result = true;
      }
    })
    return result;
  }

  const handleClickDelete = async () => {
    if (confirm('Are you sure you want to delete this environment?')) {
      setSpinning(true);
      if (isExistingComponents()) {
        setDeleteResultMessage('There are providers, apps, or resources associated with this environment.  Delete them first and then retry deleting this environment');
        setIsDeleteSuccessful(false)
        setSpinning(false);
        return;
      }
      else {
        // Delete the repo
        setIsDeleteSuccessful(true)
        setDeleteResultMessage("Deleting Repository ....")
        deleteRepo();
        await sleep(3000);
        setDeleteResultMessage("Deleting from catalog ....")
        await sleep(3000);
        deleteFromCatalog()
        setSpinning(false);
        setDeleteResultMessage("Redirect to home ....")
        navigate('/')
        setIsDeleteSuccessful(true)
        setDisabled(false)
      }
    } else {
      // Do nothing!
    }
  };

  return (
    <InfoCard title="Delete Environment">
      <CardContent>
        <Grid container spacing={2}>
          <Grid item zeroMinWidth xs={8}>
            <Typography sx={{ fontWeight: 'bold' }}>Delete this Environment</Typography>
          </Grid>
          <Grid item zeroMinWidth xs={12}>
            <Typography noWrap>
              {/* <DeleteIcon fontSize="large" /> */}
              <Button variant="contained" style={{ backgroundColor: 'red' }} onClick={handleClickDelete} disabled={disabled}>Delete</Button>
            </Typography>
          </Grid>
          <Grid item zeroMinWidth xs={12}>
            {isDeleteSuccessful && deleteResultMessage && (
              <Alert id="alertGood" sx={{ mb: 2 }} severity="success" onClose={handleCloseAlert}>
                <AlertTitle>Success</AlertTitle>
                <strong>{entity.metadata.name}</strong> was successfully deleted!
                {!!deleteResultMessage && (<><br /><br />{deleteResultMessage}</>)}
              </Alert>
            )}
            {!isDeleteSuccessful && deleteResultMessage && (
              <Alert id="alertBad" sx={{ mb: 2 }} severity="error" onClose={handleCloseAlert}>
                <AlertTitle>Error</AlertTitle>
                Failed to delete <strong>{entity.metadata.name}</strong>.
                {!!deleteResultMessage && (<><br /><br />{deleteResultMessage}</>)}
              </Alert>
            )}
          </Grid>
        </Grid>
        <Backdrop
          sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
          open={spinning}
        >
          <CircularProgress color="inherit" />
        </Backdrop>
      </CardContent>
    </InfoCard>
  );
}

export const DeleteEnvironmentCard = () => {
  const { entity } = useEntity();
  const catalogApi = useApi(catalogApiRef);
  const api = useApi(opaApiRef);
  const input = { entity, catalogApi, api }
  return <DeleteEnvironmentPanel input={input} />
};
