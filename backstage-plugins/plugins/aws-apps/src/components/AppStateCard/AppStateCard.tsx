// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0


import { Task } from '@aws-sdk/client-ecs';
import { InfoCard, EmptyState } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { LinearProgress } from '@material-ui/core';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Button, CardContent, Divider, Grid, IconButton, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { bawsApiRef } from '../../api';
import { useAsyncAwsApp } from '../../hooks/useAwsApp';

const BawsAppStateOverview = ({
  input: { account, region, cluster, serviceArn, taskDefArn }
}: { input: { account: string, region: string, cluster: string, serviceArn: string, taskDefArn: string } }) => {
  const bawsApi = useApi(bawsApiRef);
  const [taskData, setTaskData] = useState<Task>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ isError: boolean; errorMsg: string | null }>({ isError: false, errorMsg: null });

  /*
  Gets the details of a task
  Also take in wait (boolean) parameter to just add sleep
  before api call to backend
  */
  async function getTaskDetails() {
    await sleep(5000);
    return await bawsApi.getTaskDetails({
      cluster: cluster,
      service: serviceArn,
      account: account,
      region: region,
    });
  }

  /*
  gets cluster, account, region from 
  entity and also task Data
  */
  async function getData() {
    
    const tasks = await bawsApi.getTaskDetails({
      cluster,
      service: serviceArn,
      account: account,
      region: region,
    });
    setTaskData(tasks);
  }

  useEffect(() => {
    getData()
      .then(() => {
        setLoading(false);
        setError({ isError: false, errorMsg: '' });
      })
      .catch(e => {
        setLoading(false);
        setError({ isError: true, errorMsg: `Unexpected error occurred while retrieving task data: ${e}` });
      });
  }, []);

  function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  const handleStartTask = async () => {
    await bawsApi.updateService({
      cluster: cluster,
      service: serviceArn,
      desiredCount: 1,
      restart: false,
      account: account,
      region: region,
      taskDefinition: taskDefArn,
    });
    setLoading(true);

    let getTaskResult;
    do {
      getTaskResult = await getTaskDetails();
    } while (!getTaskResult.taskArn);

    setLoading(false);
    setTaskData(getTaskResult);

    while (getTaskResult.lastStatus != 'RUNNING') {
      getTaskResult = await getTaskDetails();
      setTaskData(getTaskResult);
    }
  };

  const handleStopTask = async () => {
    await bawsApi.updateService({
      cluster: cluster,
      service: serviceArn,
      desiredCount: 0,
      restart: false,
      account: account,
      region: region,
      taskDefinition: taskDefArn,
    });
    let getTaskResult;
    setLoading(true);
    do {
      getTaskResult = await getTaskDetails();
    } while (getTaskResult?.taskArn);
    setLoading(false);
    setTaskData(getTaskResult);
  };

  if (loading) {
    return (
      <InfoCard title="Application State">
        <LinearProgress />
        <Typography sx={{ color: '#645B59', mt: 2 }}>Loading current state...</Typography>
      </InfoCard>
    );
  }
  if (error.isError) {
    return <InfoCard title="Application State">{error.errorMsg}</InfoCard>;
  }

  return (
    <InfoCard title="Application State">
      <CardContent>
        <Grid container direction="column" rowSpacing={2}>
          <Grid container>
            <Grid item xs={4}>
              <Typography sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>Status</Typography>
              <Typography sx={{ mt: 1 }}>{taskData?.lastStatus ? taskData?.lastStatus : 'No Task Running'}</Typography>
            </Grid>
            <Divider orientation="vertical" flexItem sx={{ mr: '-1px' }} />
            <Grid item zeroMinWidth xs={4} sx={{ pl: 1, pr: 1 }}>
              <Typography sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>Task Arn</Typography>
              <Typography noWrap sx={{ mt: 1 }}>
                <IconButton sx={{ p: 0 }}>
                  <ContentCopyIcon></ContentCopyIcon>
                </IconButton>

                {taskData?.taskArn ? taskData?.taskArn : 'No Task Running'}
              </Typography>
            </Grid>
            <Divider orientation="vertical" flexItem sx={{ mr: '-1px' }} />
            <Grid item xs={4} sx={{ pl: 1 }}>
              <Typography sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>Created At</Typography>
              <Typography sx={{ mt: 1 }}>
                {taskData?.createdAt ? taskData?.createdAt.toString() : 'No Task Running'}
              </Typography>
            </Grid>
          </Grid>
          <Grid item>
            <Button
              sx={{ mr: 2 }}
              variant="outlined"
              size="small"
              disabled={taskData.taskArn ? true : false}
              onClick={handleStartTask}
            >
              Start Task
            </Button>
            <Button
              sx={{ mr: 2 }}
              variant="outlined"
              size="small"
              disabled={!taskData.taskArn}
              onClick={handleStopTask}
            >
              Stop Task
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </InfoCard>
  );
};

export const AppStateCard = () => {
  const awsAppLoadingStatus = useAsyncAwsApp();

  if (awsAppLoadingStatus.loading) {
    return <LinearProgress />
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
    return <BawsAppStateOverview input={input} />
  } else {
    return <EmptyState missing="data" title="No state data to show" description="State data would show here" />
  }
};
