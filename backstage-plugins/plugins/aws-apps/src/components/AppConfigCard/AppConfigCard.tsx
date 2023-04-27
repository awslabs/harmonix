// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { InfoCard, EmptyState } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { LinearProgress } from '@material-ui/core';
import { Button, CardContent, Grid, TextField, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { bawsApiRef } from '../../api';
import { useAsyncAwsApp } from '../../hooks/useAwsApp';
import { ContainerDetailsType } from '../../types';

const ContainerDetailsCard = ({
  containerDetails,
  dataChangeHandler,
  addHandler,
  saveHandler,
  removeHandler,
  editHandler,
  index,
  edit,
}: {
  containerDetails: ContainerDetailsType;
  dataChangeHandler: (event: any) => void;
  index: number;
  addHandler: (event: any) => void;
  saveHandler: (event: any) => void;
  removeHandler: (event: any) => void;
  editHandler: (event: any) => void;
  edit: boolean;
}) => {
  return (
    <Grid container sx={index == 0 ? { mt: 0 } : { mt: 5 }}>
      <Grid item xs={4}>
        <Typography sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>Container Name</Typography>
        <Typography sx={{ mt: 1 }}>{containerDetails.containerName}</Typography>
      </Grid>
      <Grid item xs={8}>
        <Typography sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>Environment Variables</Typography>
        <Button
          sx={{ mt: 1 }}
          variant="outlined"
          size="small"
          id={index.toString()}
          onClick={addHandler}
          disabled={containerDetails.env?.length != 0 && edit}
        >
          Add
        </Button>
        <Button
          sx={{ mt: 1, ml: 1 }}
          variant="outlined"
          size="small"
          id={index.toString()}
          onClick={editHandler}
          disabled={!edit}
        >
          Edit
        </Button>
        <Button
          sx={{ mt: 1, ml: 1 }}
          variant="outlined"
          size="small"
          id={index.toString()}
          onClick={saveHandler}
          disabled={edit}
        >
          Save
        </Button>
        {containerDetails.env?.length != 0 ? (
          <Grid container direction={'row'} sx={{ mt: 1 }} spacing={1}>
            <Grid item xs={5}>
              <Typography sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>Name</Typography>
            </Grid>
            <Grid item xs={5}>
              <Typography sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}> Value</Typography>
            </Grid>
          </Grid>
        ) : (
          <Typography sx={{ mt: 1 }}>
            {' '}
            No environment variables defined for container {containerDetails.containerName}
          </Typography>
        )}

        {containerDetails.env?.map(variables => (
          <Grid container key="{variables.name}" direction={'row'} sx={{ mt: 1 }} spacing={1}>
            <Grid item xs={5}>
              <TextField
                id={'key-' + index + '-' + variables.name}
                size="small"
                value={variables.name}
                onChange={dataChangeHandler}
                disabled={edit}
                error={!variables.name}
                helperText={variables.name ? '' : 'Cannot be Empty'}
              ></TextField>
            </Grid>
            <Grid item xs={5}>
              <TextField
                id={'value-' + index + '-' + variables.value}
                size="small"
                value={variables.value}
                onChange={dataChangeHandler}
                disabled={edit}
                error={!variables.value}
                helperText={variables.value ? '' : 'Cannot be Empty'}
              ></TextField>
            </Grid>

            <Button id={index + '-' + variables.name} onClick={removeHandler} disabled={edit}>
              Remove
            </Button>
          </Grid>
        ))}
      </Grid>
    </Grid>
  );
};

const BawsAppConfigOverview = ({
  input: { account, region, cluster, serviceArn, taskDefArn },
}: {
  input: { account: string; region: string; cluster: string; serviceArn: string; taskDefArn: string };
}) => {
  const bawsApi = useApi(bawsApiRef);
  const [envVariable, setEnvVariables] = useState<ContainerDetailsType[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(true);
  const [error, setError] = useState<{ isError: boolean; errorMsg: string | null }>({ isError: false, errorMsg: null });
  async function getData() {
    const taskDefinition = await bawsApi.describeTaskDefinition({
      account,
      region,
      taskDefinitionArn: taskDefArn,
    });

    const containerDetails = taskDefinition.containerDefinitions?.map(containerDef => {
      return {
        containerName: containerDef?.name,
        env: containerDef?.environment,
      };
    });

    setEnvVariables(containerDetails!);
  }

  const editHandler = () => {
    setEdit(!edit);
  };

  const saveHandler = () => {
    let emptyVar;
    envVariable.map(containerDef => {
      for (const i in containerDef.env) {
        if (containerDef.env[Number(i)].name === '' || containerDef.env[Number(i)].value === '') {
          emptyVar = true;
          break;
        }
      }
    });
    if (emptyVar) {
      return;
    } else {
      bawsApi
        .updateTaskDefinition({
          taskDefinitionArn: taskDefArn,
          account: account,
          region: region,
          envVar: envVariable,
        })
        .then(td => {
          const containerDet = td.containerDefinitions?.map(condef => {
            return {
              containerName: condef?.name,
              env: condef?.environment,
            };
          });
          setEnvVariables(containerDet!);

          setEdit(!edit);
          bawsApi
            .updateService({
              cluster: cluster,
              service: serviceArn,
              account: account,
              region: region,
              taskDefinition: taskDefArn,
              restart: true,
              desiredCount: undefined,
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
    }
  };

  const removeHandler = (event: any) => {
    let newState = [...envVariable];
    const index = event.target.id?.split('-')[0];
    const key = event.target.id.split('-')[1];
    if (newState[index].env?.length == 0 || undefined) {
      return;
    }
    for (const i in newState[index].env) {
      if (newState[index].env![Number(i)]?.name == key) {
        delete newState[index].env![Number(i)];
      }
    }
    setEnvVariables(newState);
  };

  const addHandler = (event: any) => {
    let newState = [...envVariable];
    if (newState[Number(event.target.id!)].env?.length == 0 || undefined) {
      setEdit(!edit);
    }

    newState[Number(event.target.id!)].env?.push({
      name: '',
      value: '',
    });
    setEnvVariables(newState);
  };

  const handler = (event: any) => {
    const parts = event.target.id.split('-');
    let newState = [...envVariable];
    const type = parts[0];
    const index = Number(parts[1]);
    const value = parts[2];

    if (newState[index]?.env === undefined) {
      return;
    }
    if (type == 'key') {
      for (const i in newState[index]['env']) {
        if (newState[index].env![Number(i)].name == value) {
          newState[index].env![Number(i)].name = event.target.value;
        }
      }
    }
    if (type === 'value') {
      for (const i in newState[index]['env']) {
        if (newState[index].env![Number(i)].value == value) {
          newState[index].env![Number(i)].value = event.target.value;
        }
      }
    }
    setEnvVariables(newState);
  };
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
        <Grid container direction="column" rowSpacing={2}>
          {envVariable.map((details, index) => {
            return (
              <ContainerDetailsCard
                key={index}
                containerDetails={details}
                dataChangeHandler={handler}
                addHandler={addHandler}
                saveHandler={saveHandler}
                removeHandler={removeHandler}
                index={index}
                edit={edit}
                editHandler={editHandler}
              ></ContainerDetailsCard>
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
  } else if (awsAppLoadingStatus.deployments) {
    const env1 = awsAppLoadingStatus.deployments
      .environments[Object.keys(awsAppLoadingStatus.deployments.environments)[0]];
    const input = {
      account: env1.accountNumber,
      region: env1.region,
      cluster: env1.ecs.clusterName,
      serviceArn: awsAppLoadingStatus.deployments.ecs.serviceArn,
      taskDefArn: awsAppLoadingStatus.deployments.ecs.taskDefArn,
    };
    return <BawsAppConfigOverview input={input} />;
  } else {
    return <EmptyState missing="data" title="No config data to show" description="Config data would show here" />;
  }
};
