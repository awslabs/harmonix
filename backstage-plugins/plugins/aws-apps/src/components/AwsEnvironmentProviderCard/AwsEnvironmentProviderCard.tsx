// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { InfoCard, } from '@backstage/core-components';
import { Button, IconButton, TableBody, TableCell, TableRow, Table, TableHead, CardContent, Grid } from '@material-ui/core';
import DeleteIcon from '@mui/icons-material/Delete';
import { useApi } from '@backstage/core-plugin-api';
import { opaApiRef } from '../../api';
import { Alert, AlertTitle, Typography } from '@mui/material';
import { AWSEnvironmentProviderRecord } from '@aws/plugin-aws-apps-common-for-backstage';
import { CompoundEntityRef, Entity, EntityRelation, parseEntityRef } from '@backstage/catalog-model';

import { CatalogApi, EntityRefLink, catalogApiRef, useEntity } from '@backstage/plugin-catalog-react';
import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';
import { AwsEnvironmentProviderSelectorDialog } from './AwsEnvironmentProviderSelectorDialog';


const AwsEnvironmentProviderCard = ({
  input: { entity, catalog },
}: {
  input: { entity: Entity; catalog: CatalogApi };
}) => {
  const api = useApi(opaApiRef);

  const [error, setError] = useState<{ isError: boolean; errorMsg: string | null }>({ isError: false, errorMsg: null });
  const [items, setItems] = useState<AWSEnvironmentProviderRecord[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [isAddProviderSuccessful, setIsAddProviderSuccessful] = useState(false);
  const [addProviderMessage, setAddProviderMessage] = useState("");
  const [providerRequest, setProviderRequest] = useState<AWSEnvironmentProviderRecord>();
  const [availableProviders, setAvailableProviders] = useState<AWSEnvironmentProviderRecord[]>([]);

  useEffect(() => {
    getProviderDetails()
  }, []);

  async function getProviderDetails() {
    // find existing resource relationships
    const providerRefs: EntityRelation[] | undefined = entity.relations?.filter(
      relation => parseEntityRef(relation?.targetRef).kind === 'awsenvironmentprovider')!;

    const providerEntities = await Promise.all(providerRefs.map(async (entityRef: { targetRef: string | CompoundEntityRef; }) => {
      const entity = await catalog.getEntityByRef(entityRef.targetRef);
      return entity;
    }));

    let providers: AWSEnvironmentProviderRecord[] = [];

    providerEntities.forEach((et, index) => {

      providers.push({
        id: index.toString(),
        name: et?.metadata.name || '',
        prefix: et?.metadata['prefix']?.toString() || '',
        providerType: et?.metadata['envType']?.toString() || '',
        description: et?.metadata['description']?.toString() || '',
        accountNumber: et?.metadata['awsAccount']?.toString() || '',
        region: et?.metadata['awsRegion']?.toString() || ''
      })
    })
    setItems(providers)

    let potentialProviders: AWSEnvironmentProviderRecord[] = [];
    let index = 0;
    const envRuntimeType = entity.metadata.environmentType?.toString() || ""

    catalog.getEntities({ filter: { 'kind': "awsenvironmentprovider", 'metadata.envType':envRuntimeType } }).then(entities => {
      entities.items.forEach((et) => {
        if (providers.length > 0) {
          providers.forEach(existingP => {
            if (et.metadata.name === existingP.name && et.metadata['prefix']?.toString() === existingP.prefix) {
              // skip existing provider
            } else {
              index++;
              potentialProviders.push({
                id: index.toString(),
                name: et?.metadata.name || '',
                prefix: et?.metadata['prefix']?.toString() || '',
                providerType: et?.metadata['envType']?.toString() || '',
                description: et?.metadata['description']?.toString() || '',
                accountNumber: et?.metadata['awsAccount']?.toString() || '',
                region: et?.metadata['awsRegion']?.toString() || ''
              })
            }
          })
        }
        else {
          index++;
          potentialProviders.push({
            id: index.toString(),
            name: et?.metadata.name || '',
            prefix: et?.metadata['prefix']?.toString() || '',
            providerType: et?.metadata['envType']?.toString() || '',
            description: et?.metadata['description']?.toString() || '',
            accountNumber: et?.metadata['awsAccount']?.toString() || '',
            region: et?.metadata['awsRegion']?.toString() || ''
          })
        }
      })
    });
    setAvailableProviders(potentialProviders)
  }

  async function updateProvider(item: AWSEnvironmentProviderRecord, action: string): Promise<any> {

    const backendParamsOverrides = {
      appName: '',
      awsAccount: item.accountNumber,
      awsRegion: item.region,
      prefix: item.prefix,
      providerName: item.name.toLowerCase()
    };

    const params = {
      gitHost: entity.metadata['repoUrl'] ? entity.metadata['repoUrl'].toString().split('?')[0] : "",
      gitRepoName: entity.metadata.repoUrl?.toString().split('repo=')[1].toLowerCase() || "",
      provider: item,
      gitProjectGroup: 'aws-environments',
      gitAdminSecret: 'opa-admin-gitlab-secrets',
      envName: entity.metadata.name.toLowerCase(),
      action,
      backendParamsOverrides
    }
    api.updateProviderToEnvironment(params)

  }

  const handleClickAdd = async () => {
    setOpenDialog(true);
  };

  const closeDialog = () => setOpenDialog(false);

  const selectProviderHandler = (item: AWSEnvironmentProviderRecord) => {
    setSpinning(true)
    updateProvider(item, "add").then(async results => {
      setAddProviderMessage(results)
      setIsAddProviderSuccessful(true)
      setSpinning(false)
      let newList: AWSEnvironmentProviderRecord[] = []
      newList = newList.concat(items)
      newList.push(item)
      setItems(newList)
      setProviderRequest(item)
      await catalog.refreshEntity(`awsenvironment:default/${entity.metadata.name}`);
    }).catch(err => {
      setIsAddProviderSuccessful(false)
      setAddProviderMessage(err)
      console.log(err);
      setError(err)
      setSpinning(false)
    })
  }

  const deleteClick = async (index: number) => {
    const deletedItem = items.at(index)
    if (confirm('Are you sure you want to remove this environment provider from this environment?')) {
      setSpinning(true)
      updateProvider(deletedItem!, "remove").then(async results => {
        setAddProviderMessage(results)
        setIsAddProviderSuccessful(true)
        setSpinning(false)
        //remove from table
        const providersData = items.slice();
        providersData.splice(index, 1);
        setItems(providersData);
        setProviderRequest(deletedItem!)
        await catalog.refreshEntity(`awsenvironment:default/${entity.metadata.name}`);
        await catalog.refreshEntity(`awsenvironmentprovider:default/${deletedItem?.name}`);
      }).catch(err => {
        setIsAddProviderSuccessful(false)
        setAddProviderMessage(err)
        console.log(err);
        setError(err)
        setSpinning(false)
      })
    }
  }

  const handleCloseAlert = () => {
    setAddProviderMessage("");
  };

  const deleteIcon = (index: number) => (
    <IconButton onClick={() => deleteClick(index)}>
      <DeleteIcon color="primary" />
    </IconButton>
  );

  if (error.isError) {
    return <Typography sx={{ color: 'red' }}>{error.errorMsg}</Typography>;
  }

  return (
    <InfoCard title="Environment Providers">
      <CardContent>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Prefix</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Account</TableCell>
              <TableCell>Region</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {
              items.map((record, index) => {
                return (
                  <TableRow key={record.id} >
                    <TableCell id='id'>{record.id}</TableCell>
                    <TableCell id='providerName'><EntityRefLink entityRef={`awsenvironmentprovider:default/${record.name}`} title={record.name} /></TableCell>
                    <TableCell id='providerPrefix'>{record.prefix} </TableCell>
                    <TableCell id='providerType'>{record.providerType} </TableCell>
                    <TableCell id='providerAccount'>{record.accountNumber}</TableCell>
                    <TableCell id='providerRegion'>{record.region}</TableCell>
                    <TableCell id='action'> {deleteIcon(index)}</TableCell>
                  </TableRow>
                )
              })
            }
          </TableBody>
        </Table>
        <Grid item zeroMinWidth xs={12}>
          {isAddProviderSuccessful && !!addProviderMessage && (
            <Alert sx={{ mb: 2 }} severity="success" onClose={handleCloseAlert}>
              <AlertTitle>Success</AlertTitle>
              <strong>{providerRequest?.name}</strong> Updated Provider successfully!
              {!!addProviderMessage && (<><br /><br />{addProviderMessage}</>)}
            </Alert>
          )}
          {!isAddProviderSuccessful && !!addProviderMessage && (
            <Alert sx={{ mb: 2 }} severity="error" onClose={handleCloseAlert}>
              <AlertTitle>Error</AlertTitle>
              Failed to Update provider <strong>{providerRequest?.name}</strong>
              {!!addProviderMessage && (<><br /><br />{addProviderMessage}</>)}
            </Alert>
          )}
        </Grid>
        <Typography margin={'10px'}>
          <Button variant="contained" onClick={handleClickAdd}>Add</Button>
          <AwsEnvironmentProviderSelectorDialog providersInput={availableProviders} isOpen={openDialog} selectHandler={selectProviderHandler} closeDialogHandler={closeDialog} />
        </Typography>
        <Backdrop
          sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
          open={spinning}
        >
          <CircularProgress color="inherit" />
        </Backdrop>
      </CardContent>
    </InfoCard>
  );
};

export const AwsEnvironmentProviderCardWidget = () => {
  const catalogApi = useApi(catalogApiRef);
  const { entity } = useEntity();

  const input = {
    entity,
    catalog: catalogApi
  };
  return <AwsEnvironmentProviderCard input={input} />;
};
