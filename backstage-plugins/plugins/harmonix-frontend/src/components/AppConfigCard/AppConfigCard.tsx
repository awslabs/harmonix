// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { InfoCard, EmptyState } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { IconButton, LinearProgress, Tooltip } from '@material-ui/core';
import { Button, CardContent, Grid, TextField, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import React, { useEffect, useState } from 'react';
import { opaApiRef } from '../../api';
import { useAsyncAwsApp } from '../../hooks/useAwsApp';
import { ContainerDetailsType } from '../../types';
import { AWSComponent, AWSECSAppDeploymentEnvironment } from '@aws/plugin-aws-apps-common-for-backstage';

const AppConfigOverview = ({
  input: { awsComponent },
}: {
  input: {
    awsComponent: AWSComponent;
  };
}) => {
  const api = useApi(opaApiRef);

  // States managed by React useState
  const [savedEnvVariables, setSavedEnvVariables] = useState<ContainerDetailsType[]>([]);
  const [envVariables, setEnvVariables] = useState<ContainerDetailsType[]>([]);
  const [loading, setLoading] = useState(true);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [edit, setEdit] = useState(false);
  const [error, setError] = useState<{ isError: boolean; errorMsg: string | null }>({ isError: false, errorMsg: null });
  const env = awsComponent.currentEnvironment as AWSECSAppDeploymentEnvironment;
  // get latest task definition
  const latestTaskDef = env.app.taskDefArn.substring(0, env.app.taskDefArn.lastIndexOf(":"))

  async function getData() {
    const taskDefinition = await api.describeTaskDefinition({
      taskDefinitionArn: latestTaskDef,
    });

    const containerDetails = taskDefinition.containerDefinitions?.map(containerDef => {
      return {
        containerName: containerDef?.name,
        env: containerDef?.environment,
      };
    });

    setSavedEnvVariables(containerDetails!);
    setEnvVariables(containerDetails!);
  }

  useEffect(() => {
    getData()
      .then(() => {
        setLoading(false);
        setError({ isError: false, errorMsg: '' });
      })
      .catch(e => {
        setError({ isError: true, errorMsg: `Unexpected error occurred while getting taskDefinition data: ${e}` });
        setLoading(false);
      });
  }, []);

  const onEdit = (containerName: string) => {

    // don't allow switching out of edit mode if any environment variables are empty
    if (edit) {
      let emptyVar = false;
      const containerDetails = envVariables.filter(details => details.containerName === containerName)[0];

      for (const i in containerDetails.env) {
        if (containerDetails.env[Number(i)].name === '' || containerDetails.env[Number(i)].value === '') {
          emptyVar = true;
          break;
        }
      }

      if (emptyVar) {
        return;
      }
    }

    setEdit(!edit);
  };

  const onSave = () => {
    setLoading(true);
    let emptyVar = false;
    const env = awsComponent.currentEnvironment as AWSECSAppDeploymentEnvironment;
    envVariables.map(containerDef => {
      for (const i in containerDef.env) {
        if (containerDef.env[Number(i)].name === '' || containerDef.env[Number(i)].value === '') {
          emptyVar = true;
          break;
        }
      }
    });

    if (emptyVar) {
      return;
    }

    api
      .updateTaskDefinition({
        taskDefinitionArn: latestTaskDef,
        envVar: envVariables
      })
      .then(td => {
        const containerDet = td.containerDefinitions?.map(condef => {
          return {
            containerName: condef?.name,
            env: condef?.environment,
          };
        });

        setSavedEnvVariables(containerDet!);
        setEnvVariables(containerDet!);
        setUnsavedChanges(false);
        setEdit(false);

        api
          .updateService({
            cluster: env.clusterName,
            service: env.app.serviceArn,
            taskDefinition: env.app.taskDefArn,
            restart: true,
            desiredCount: undefined,
            // prefix,
            // providerName
          })
          .then(() => {
            setLoading(false);
            setError({ isError: false, errorMsg: '' });
          });
      })
      .catch(e => {
        setLoading(false);
        setError({ isError: true, errorMsg: `Unexpected error occurred while udpating taskDefinition: ${e}` });
      });

  };

  // Returns a new object reference that is a shallow clone of envVariables, except for the
  // specific containerName, which will be deep cloned.
  const getEnvVarsPartialDeepClone = (containerName: string): ContainerDetailsType[] => {
    const newState = [...envVariables];
    const containerIndex = newState.findIndex((search: ContainerDetailsType) => search.containerName === containerName);

    // the env array object reference needs to be changed or else we can't detect
    // unsaved changes
    newState[containerIndex] = { ...envVariables[containerIndex] };
    newState[containerIndex].env = [...(newState[containerIndex].env || [])];

    return newState;
  };

  const checkForUnsavedChanges = (containerName: string, newDetails: ContainerDetailsType[]) => {

    if (savedEnvVariables === newDetails) {
      setUnsavedChanges(false);
      return;
    }

    if (savedEnvVariables.length !== newDetails.length) {
      setUnsavedChanges(true);
      return;
    }

    const savedDetails = savedEnvVariables.filter(details => details.containerName === containerName)[0];
    const details = newDetails.filter(details => details.containerName === containerName)[0];

    if (savedDetails.env?.length !== details.env?.length) {
      setUnsavedChanges(true);
      return;
    }

    // Note - cannot use a forEach loop here since we want to return from this function immediately
    // if we find unsaved changes
    for (let index = 0; index < (savedDetails.env?.length || 0); index++) {
      const keyValPair = savedDetails.env![index];

      if (keyValPair?.name !== details.env?.[index]?.name ||
        keyValPair?.value !== details.env?.[index]?.value) {

        setUnsavedChanges(true);
        return;
      }
    }

    setUnsavedChanges(false);
  }

  const onEnvVarChange = (containerName: string, type: string, value: string, envVarIndex: number) => {
    const newState = getEnvVarsPartialDeepClone(containerName);
    const containerDetails = newState.filter(details => details.containerName === containerName)[0];

    const originalKeyVal = containerDetails.env![envVarIndex];

    if (type === "key") {
      containerDetails.env![envVarIndex] = { ...originalKeyVal, name: value };
    } else {
      containerDetails.env![envVarIndex] = { ...originalKeyVal, value };
    }

    checkForUnsavedChanges(containerName, newState);
    setEnvVariables(newState);
  };

  const onDeleteEnvVar = (containerName: string, envVarIndex: number) => {
    const newState = getEnvVarsPartialDeepClone(containerName);
    const containerDetails = newState.filter(details => details.containerName === containerName)[0];
    containerDetails.env!.splice(envVarIndex, 1); // delete the env var out of the array
    checkForUnsavedChanges(containerName, newState);
    setEnvVariables(newState);
  }

  const onAddEnvVar = (containerName: string) => {
    const newState = getEnvVarsPartialDeepClone(containerName);

    const containerDetails = newState.filter(details => details.containerName === containerName)[0];

    if (!containerDetails.env) {
      containerDetails.env = [];
    }

    containerDetails.env.push({ name: '', value: '' });

    setEdit(true);
    setUnsavedChanges(true);
    setEnvVariables(newState);
  };

  if (loading) {
    return (
      <InfoCard title="Application Configuration">
        <LinearProgress />
      </InfoCard>
    );
  }

  if (error.isError) {
    return <InfoCard title="Application Configuration">{error.errorMsg}</InfoCard>;
  }

  return (
    <InfoCard title="Application Configuration">
      <CardContent sx={{ mt: 2 }}>
        <Grid container direction="column" rowSpacing={4}>
          {envVariables.map((containerDetails, index) => {
            return (
              <div key={containerDetails.containerName}>
                <Grid key={`${containerDetails.containerName!}Grid`} container sx={index == 0 ? { mt: 0 } : { mt: 5 }}>
                  <Grid item xs={12}>
                    <Typography sx={{ fontWeight: 'bold' }}>ENVIRONMENT VARIABLES: "{containerDetails.containerName}"</Typography>
                    <Button
                      sx={{ mt: 1 }}
                      variant="outlined"
                      size="small"
                      id={index.toString()}
                      onClick={() => onAddEnvVar(containerDetails.containerName!)}
                    >
                      Add
                    </Button>
                    <Button
                      sx={{ mt: 1, ml: 1 }}
                      variant="outlined"
                      size="small"
                      id={index.toString()}
                      onClick={() => onEdit(containerDetails.containerName!)}
                      disabled={!containerDetails.env || !containerDetails.env.length}
                    >
                      Edit
                    </Button>
                    <Button
                      sx={{ mt: 1, ml: 1 }}
                      variant="outlined"
                      size="small"
                      id={index.toString()}
                      onClick={onSave}
                      disabled={!unsavedChanges}
                    >
                      Save
                    </Button>
                    {containerDetails.env?.length != 0 ? (
                      <Grid container direction={'row'} sx={{ mt: 1 }} spacing={1}>
                        <Grid item xs={edit ? 5 : 6}>
                          <Typography sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>Name</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}> Value</Typography>
                        </Grid>
                      </Grid>
                    ) : (
                      <Typography sx={{ mt: 1 }}>
                        {' '}
                        No environment variables defined for container {containerDetails.containerName}
                      </Typography>
                    )}

                    {containerDetails.env?.map((nameAndValue, envVarIndex) => (
                      <Grid container key={`${containerDetails.containerName}${envVarIndex}`} direction={'row'} sx={{ mt: 1 }} spacing={1}>
                        <Grid item xs={edit ? 5 : 6}>

                          <TextField
                            id={`key|${index}|${envVarIndex}`}
                            size="small"
                            fullWidth
                            value={nameAndValue.name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onEnvVarChange(containerDetails.containerName!, "key", e.target.value, envVarIndex)}
                            disabled={!edit}
                            error={!nameAndValue.name}
                            helperText={nameAndValue.name ? '' : 'Cannot be Empty'}
                          ></TextField>
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            id={`value|${index}|${envVarIndex}`}
                            size="small"
                            fullWidth
                            value={nameAndValue.value}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onEnvVarChange(containerDetails.containerName!, "value", e.target.value, envVarIndex)}
                            disabled={!edit}
                            error={!nameAndValue.value}
                            helperText={nameAndValue.value ? '' : 'Cannot be Empty'}
                          ></TextField>
                        </Grid>
                        {edit &&
                          <Grid item xs={1}>

                            <Tooltip title="Delete">
                              <IconButton size="small" aria-label="delete" onClick={() => onDeleteEnvVar(containerDetails.containerName!, envVarIndex)}>
                                <DeleteIcon aria-label="delete" color="primary" />
                              </IconButton>
                            </Tooltip>
                          </Grid>
                        }
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              </div>
            );
          })}
        </Grid>
      </CardContent>
    </InfoCard>
  );
};

export const AppConfigCard = () => {
  const awsAppLoadingStatus = useAsyncAwsApp();

  if (awsAppLoadingStatus.loading) {
    return <LinearProgress />;
  } else if (awsAppLoadingStatus.component) {
    const input = {
      awsComponent: awsAppLoadingStatus.component
    };

    return <AppConfigOverview input={input} />;
  } else {
    return <EmptyState missing="data" title="No config data to show" description="Config data would show here" />;
  }
};
