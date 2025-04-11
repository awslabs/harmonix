// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { EmptyState, InfoCard, } from '@backstage/core-components';
import { Button, IconButton, LinearProgress, TableBody, TableCell, TableRow, Table, TableHead, CardContent, Grid } from '@material-ui/core';
import DeleteIcon from '@mui/icons-material/Delete';
import { useApi } from '@backstage/core-plugin-api';
import { opaApiRef } from '../../api';
import { Alert, AlertTitle, Typography } from '@mui/material';
import { useAsyncAwsApp } from '../../hooks/useAwsApp';
import { AWSComponent, AssociatedResources, BindResourceParams, ResourceBinding, ResourcePolicy, getGitCredentailsSecret } from '@aws/plugin-aws-apps-common-for-backstage';
import { CompoundEntityRef, Entity, EntityRelation, parseEntityRef } from '@backstage/catalog-model';
import { CatalogApi, EntityRefLink, catalogApiRef, useEntity } from '@backstage/plugin-catalog-react';
import { ResourceSelectorDialog } from './ResourceSelectorDialog';
import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';

// TODO: Externalize policy templates to a repo path for easy updates and access control
const RDS_POLICY = `{
  "Effect": "Allow",
  "Action": ["rds:*"],
  "Resource": "@@@PLACEHOLDER@@@"
}`;

const SECRET_POLICY = `{
  "Effect": "Allow",
  "Action": ["secretsmanager:*"],
  "Resource": "@@@PLACEHOLDER@@@"
}`;

const S3_POLICY = `{
  "Effect": "Allow",
  "Action": ["s3:*"],
  "Resource": [@@@PLACEHOLDER@@@]
}`;

const ResourceBindingCard = ({
  input: { awsComponent, entity, catalog },
}: {
  input: { awsComponent: AWSComponent; entity: Entity; catalog: CatalogApi };
}) => {
  const api = useApi(opaApiRef);

  const [error, setError] = useState<{ isError: boolean; errorMsg: string | null }>({ isError: false, errorMsg: null });
  const [items, setItems] = useState<ResourceBinding[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [isBindSuccessful, setIsBindSuccessful] = useState(false);
  const [bindResourceMessage, setBindResourceMessage] = useState("");
  const [bindResourceRequest, setBindResourceRequest] = useState<ResourceBinding>();
  const repoInfo = awsComponent.getRepoInfo();
  useEffect(() => {
    getBindingDetails()

  }, []);

  async function getBindingDetails() {
    // find existing resource relationships
    const resourceRefs: EntityRelation[] | undefined = entity.relations?.filter(
      relation => parseEntityRef(relation?.targetRef).kind === 'resource')!;

    const resourcesEntities = await Promise.all(resourceRefs.map(async (entityRef: { targetRef: string | CompoundEntityRef; }) => {
      const entity = await catalog.getEntityByRef(entityRef.targetRef);
      return entity;
    }));

    //select view for only current environment
    const currentEnvironment = awsComponent.currentEnvironment.environment.name;

    const matchedResources = resourcesEntities.filter(entity => {
      const appData = entity!.metadata["appData"] as any;
      return appData && appData[currentEnvironment]
    })

    let resources: ResourceBinding[] = [];

    matchedResources.forEach(et => {
      const appData = et!.metadata["appData"] as any;
      const envAppData = appData[currentEnvironment] as any;
      const providers = Object.keys(envAppData)
      providers.forEach(p => {
        const providerAppData = envAppData[p] as any;
        if (et!.metadata['resourceType'] === "aws-rds") {

          const associatedRDSResources: AssociatedResources =
          {
            resourceArn: providerAppData['DbAdminSecretArn'],
            resourceType: "aws-db-secret",
            resourceName: `${et!.metadata.name}-secret`
          }

          resources.push(
            {
              resourceName: et!.metadata.name,
              resourceType: et!.metadata['resourceType']?.toString() || "",
              provider: p,
              resourceArn: providerAppData['Arn'],
              id: providerAppData['Arn'],
              entityRef: "resource:default/" + et!.metadata.name,
              associatedResources: [associatedRDSResources]
            })
        }
        else {
          resources.push(
            {
              resourceName: et!.metadata.name,
              resourceType: et!.metadata['resourceType']?.toString() || "",
              provider: p,
              resourceArn: providerAppData['Arn'],
              id: providerAppData['Arn'],
              entityRef: "resource:default/" + et!.metadata.name
            }
          )
        }
      })
    })
    // console.log(resources)
    setItems(resources)

  }

  async function bindResource(item: ResourceBinding): Promise<any> {
    let policies: ResourcePolicy[] = [];

    if (item.resourceType === "aws-rds") {
      const rdsPolicy = RDS_POLICY.replace("@@@PLACEHOLDER@@@", item.resourceArn);
      policies.push({
        policyFileName: `statement-rds-${awsComponent.currentEnvironment.environment.name}-${item.provider}-${item.resourceName}`,
        policyContent: rdsPolicy,
        policyResource: item.resourceType
      });
      if (item.associatedResources && item.associatedResources.length > 0) {
        item.associatedResources.forEach(ar => {
          if (ar.resourceType === "aws-db-secret") {
            const secretPolicy = SECRET_POLICY.replace("@@@PLACEHOLDER@@@", ar.resourceArn);
            policies.push({
              policyFileName: `statement-secrets-${awsComponent.currentEnvironment.environment.name}-${item.provider}-${item.resourceName}`,
              policyContent: secretPolicy,
              policyResource: item.resourceType
            });
          }
        })
      }
    } else if (item.resourceType === "aws-db-secret") {
      const secretPolicy = SECRET_POLICY.replace("@@@PLACEHOLDER@@@", item.resourceArn);
      policies.push({
        policyFileName: `statement-secrets-${awsComponent.currentEnvironment.environment.name}-${item.provider}-${item.resourceName}`,
        policyContent: secretPolicy,
        policyResource: item.resourceType
      });
    }
    else if (item.resourceType === "aws-secretsmanager") {
      const secretPolicy = SECRET_POLICY.replace("@@@PLACEHOLDER@@@", item.resourceArn);
      policies.push({
        policyFileName: `statement-secrets-${awsComponent.currentEnvironment.environment.name}-${item.provider}-${item.resourceName}`,
        policyContent: secretPolicy,
        policyResource: item.resourceType
      });
    } else if (item.resourceType === "aws-s3") {
      const s3Policy = S3_POLICY.replace("@@@PLACEHOLDER@@@", `"${item.resourceArn}","${item.resourceArn}/*"`);
      policies.push({
        policyFileName: `statement-s3-${awsComponent.currentEnvironment.environment.name}-${item.provider}-${item.resourceName}`,
        policyContent: s3Policy,
        policyResource: item.resourceType
      });
    }


    const params: BindResourceParams = {
      providerName: item.provider,
      envName: awsComponent.currentEnvironment.environment.name,
      appName: entity.metadata.name,
      resourceName: item.resourceName,
      resourceEntityRef: item.id,
      policies
    };

    return api.bindResource({ repoInfo, params, gitAdminSecret: getGitCredentailsSecret(repoInfo) })
  }

  async function removeResource(item: ResourceBinding): Promise<any> {
    let policies: ResourcePolicy[] = [];

    if (item.resourceType === "aws-rds") {
      policies.push({
        policyFileName: `statement-rds-${awsComponent.currentEnvironment.environment.name}-${item.provider}-${item.resourceName}`,
        policyContent: "",
        policyResource: item.resourceType
      });
      if (item.associatedResources && item.associatedResources.length > 0) {
        item.associatedResources.forEach(ar => {
          if (ar.resourceType === "aws-db-secret") {
            policies.push({
              policyFileName: `statement-secrets-${awsComponent.currentEnvironment.environment.name}-${item.provider}-${item.resourceName}`,
              policyContent: "",
              policyResource: item.resourceType
            });
          }
        })
      }
    } else if (item.resourceType === "aws-db-secret") {
      policies.push({
        policyFileName: `statement-secrets-${awsComponent.currentEnvironment.environment.name}-${item.provider}-${item.resourceName}`,
        policyContent: "",
        policyResource: item.resourceType
      });
    }

    const params: BindResourceParams = {

      providerName: item.provider,
      envName: awsComponent.currentEnvironment.environment.name,
      appName: entity.metadata.name,
      resourceName: item.resourceName,
      resourceEntityRef: item.entityRef!,
      policies
    };

    return api.unBindResource({ repoInfo, params, gitAdminSecret: getGitCredentailsSecret(repoInfo) })
  }


  const handleClickAdd = async () => {
    setOpenDialog(true);
  };

  const closeDialog = () => setOpenDialog(false);

  const selectResourceHandler = (item: ResourceBinding) => {
    setSpinning(true)
    setBindResourceRequest(item)
    bindResource(item).then(results => {
      setBindResourceMessage(results.message)
      setIsBindSuccessful(true)

      setSpinning(false)
    }).catch(err => {
      setIsBindSuccessful(false)
      setBindResourceMessage(err)
      console.log(err);
      setError(err)
      setSpinning(false)
    })

  }

  const deleteClick = async (index: number) => {
    const deletedItem = items.at(index)
    setSpinning(true)
    removeResource(deletedItem!).then(results => {
      setBindResourceMessage(results.message)
      setIsBindSuccessful(true)

      //remove from table
      const resourceData = items.slice();
      resourceData.splice(index, 1);
      setItems(resourceData);
      setSpinning(false)
    }).catch(err => {
      setIsBindSuccessful(false)
      setBindResourceMessage(err)
      console.log(err);
      setError(err)
      setSpinning(false)
    })
  }

  const handleCloseAlert = () => {
    setBindResourceMessage("");
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
    <InfoCard title="Bound Resources">
      <CardContent>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Resource ID</TableCell>
              <TableCell>Provider</TableCell>
              <TableCell>Resource Name</TableCell>
              <TableCell>Resource Type</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {
              items.map((record, index) => {
                return (
                  <TableRow key={record.id} >
                    <TableCell id='id'>{record.id}</TableCell>
                    <TableCell id='provider'><EntityRefLink entityRef={`awsenvironmentprovider:default/${record.provider}`} title={record.provider} /></TableCell>
                    <TableCell id='resourceName'><EntityRefLink entityRef={record.entityRef!} title={record.resourceName} /> </TableCell>
                    <TableCell id='resourceType'>{record.resourceType}</TableCell>
                    <TableCell id='action'> {deleteIcon(index)}</TableCell>
                  </TableRow>
                )
              })
            }
          </TableBody>
        </Table>
        <Grid item zeroMinWidth xs={12}>
          {isBindSuccessful && !!bindResourceMessage && (
            <Alert sx={{ mb: 2 }} severity="success" onClose={handleCloseAlert}>
              <AlertTitle>Success</AlertTitle>
              <strong>{bindResourceRequest?.resourceName!}</strong> was successfully scheduled!
              {!!bindResourceMessage && (<><br /><br />{bindResourceMessage}</>)}
            </Alert>
          )}
          {!isBindSuccessful && !!bindResourceMessage && (
            <Alert sx={{ mb: 2 }} severity="error" onClose={handleCloseAlert}>
              <AlertTitle>Error</AlertTitle>
              Failed to schedule <strong>{bindResourceRequest?.resourceName!}</strong> Binding.
              {!!bindResourceMessage && (<><br /><br />{bindResourceMessage}</>)}
            </Alert>
          )}
        </Grid>
        <Typography margin={'10px'}>
          <Button variant="contained" onClick={handleClickAdd}>Add</Button>
          <ResourceSelectorDialog associatedResources={items} currentEnvironment={awsComponent.currentEnvironment.environment.name} catalog={catalog} isOpen={openDialog} selectHandler={selectResourceHandler} closeDialogHandler={closeDialog} />
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

export const ResourceBindingCardWidget = () => {
  const awsAppLoadingStatus = useAsyncAwsApp();
  const catalogApi = useApi(catalogApiRef);
  const { entity } = useEntity();

  if (awsAppLoadingStatus.loading) {
    return <LinearProgress />;
  } else if (awsAppLoadingStatus.component) {
    const input = {
      awsComponent: awsAppLoadingStatus.component,
      entity,
      catalog: catalogApi
    };
    return <ResourceBindingCard input={input} />;
  } else {
    return <EmptyState missing="data" title="No resource binding data to show" description="Resource binding data would show here" />;
  }
};
