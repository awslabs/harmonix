// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { InfoCard, EmptyState } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { LinearProgress } from '@material-ui/core';
import { Button, CardContent, Divider, Grid, Typography } from '@mui/material';
import React, { useState, useEffect, useRef } from 'react';
import { DescribeStackEventsCommandOutput, UpdateStackCommandOutput, CreateStackCommandOutput, DeleteStackCommandOutput, } from "@aws-sdk/client-cloudformation";
import { opaApiRef } from '../../api';
import { useAsyncAwsApp } from '../../hooks/useAwsApp';
import { formatWithTime } from '../../helpers/date-utils';
import { useCancellablePromise } from '../../hooks/useCancellablePromise';
import { AWSComponent, AWSServerlessAppDeploymentEnvironment, CloudFormationStack } from '@aws/plugin-aws-apps-common-for-backstage';

type stackEvent = {
  action: string | undefined;
  resourceType: string | undefined;
  logicalResourceId: string | undefined;
}

const eventStyle = { paddingRight: "15px" };

const OpaAppStateOverview = ({
  input: { awsComponent, stack, s3BucketName, refresh }
}: { input: { awsComponent: AWSComponent, stack: CloudFormationStack, s3BucketName: string, refresh: VoidFunction } }) => {
  const api = useApi(opaApiRef)

  const [polling, setPolling] = useState(false);
  const [pollingEnabled, setPollingEnabled] = useState(true);
  const [events, setEvents] = useState<stackEvent[]>([]);
  const [error, setError] = useState<{ isError: boolean; errorMsg: string | null }>({ isError: false, errorMsg: null });
  const timerRef = useRef<any>(null);
  const { cancellablePromise } = useCancellablePromise({ rejectOnCancel: true });

  useEffect(() => {

    if (pollingEnabled && stack.stackDeployStatus.endsWith('PROGRESS')) {
      getStackEvents().then(_ => { });
    }

    return () => {
      setPollingEnabled(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

    }

  }, []);

  /*
  Gets the stack event details
  */
  async function getStackEvents() {
    setPolling(true);

    let isCanceled = false;
    let count = 0;
    while (pollingEnabled && count < 720) {
      if (count > 0) {
        await sleep(5000);
      }
      count++;
      try {
        const stackEvents = await cancellablePromise<DescribeStackEventsCommandOutput>(api.getStackEvents({
          stackName: stack.stackName,
        }));

        if (!stackEvents.StackEvents) {
          break;
        }

        const mostRecentEvent = stackEvents.StackEvents[0];
        const isDone = mostRecentEvent.ResourceType === 'AWS::CloudFormation::Stack'
          && !!mostRecentEvent.ResourceStatus
          && (mostRecentEvent.ResourceStatus!.endsWith('COMPLETE') || mostRecentEvent.ResourceStatus!.endsWith('FAILED'))

        if (isDone) {
          break;
        }

        if (stack.lastUpdatedTime && stackEvents.StackEvents[0].Timestamp) {
          let eventsLastUpdated = formatWithTime(new Date(stackEvents.StackEvents[0].Timestamp));
          eventsLastUpdated = eventsLastUpdated.substring(0, eventsLastUpdated.indexOf('('));
          let stackLastUpdated = stack.lastUpdatedTime;
          stackLastUpdated = stackLastUpdated.substring(0, stackLastUpdated.indexOf('('));
        }

        let maxEventsShown = 5;
        if (stackEvents.StackEvents.length < (maxEventsShown)) {
          maxEventsShown = stackEvents.StackEvents.length;
        }

        // truncate the events list using slice and only show the most recent events
        const visibleEvents: stackEvent[] = stackEvents.StackEvents.slice(0, maxEventsShown).map(ev => {
          return {
            action: ev.ResourceStatus,
            resourceType: ev.ResourceType,
            logicalResourceId: ev.LogicalResourceId
          };
        });

        setEvents(visibleEvents);

      } catch (e) {
        if ((e as any).isCanceled) {
          isCanceled = true;
        } else {
          console.error(e);
          setError({ isError: true, errorMsg: `Unexpected error occurred while retrieving event data: ${e}` });
        }
        break;
      }

    }

    if (!isCanceled) {
      setPolling(false);
      refresh();
    }

  }

  function sleep(ms: number) {
    return new Promise(resolve => {

      const resolveHandler = () => {
        clearTimeout(timerRef.current);
        resolve(null);
      }
      timerRef.current = setTimeout(resolveHandler, ms);
    });
  }

  const handleStartDeployment = async () => {
    if (stack.stackDeployStatus.includes('STAGED')) {
      return handleCreateDeployment();
    } else {
      return handleUpdateDeployment();
    }
  }

  const handleUpdateDeployment = async () => {

    setEvents([]);
    setPolling(true);

    try {
      await cancellablePromise<UpdateStackCommandOutput>(api.updateStack({
        componentName: awsComponent.componentName,
        stackName: stack.stackName,
        s3BucketName,
        cfFileName: "packaged.yaml",
        environmentName: awsComponent.currentEnvironment.environment.name,
        gitHost: awsComponent.gitHost,
        gitProjectGroup: 'aws-app',
        gitAdminSecret: 'opa-admin-gitlab-secrets',
        gitRepoName: awsComponent.gitRepo.split('/')[1],
      }));

      getStackEvents();
    } catch (e) {
      if (!(e as any).isCanceled) {
        console.error(e);
        setError({ isError: true, errorMsg: `Unexpected error occurred while updating the deployment: ${e}` });
      }
    }

  };

  const handleCreateDeployment = async () => {

    setEvents([]);
    setPolling(true);

    try {
      await cancellablePromise<CreateStackCommandOutput>(api.createStack({
        componentName: awsComponent.componentName,
        stackName: stack.stackName,
        s3BucketName,
        cfFileName: "packaged.yaml",
        environmentName: awsComponent.currentEnvironment.environment.name,
        gitHost: awsComponent.gitHost,
        gitProjectGroup: 'aws-app',
        gitAdminSecret: 'opa-admin-gitlab-secrets',
        gitRepoName: awsComponent.gitRepo.split('/')[1],
      }));

      getStackEvents();
    } catch (e) {
      if (!(e as any).isCanceled) {
        console.error(e);
        setError({ isError: true, errorMsg: `Unexpected error occurred while creating the deployment: ${e}` });
      }
    }

  };

  const handleStopApp = async () => {
    setEvents([]);
    setPolling(true);

    try {
      await cancellablePromise<DeleteStackCommandOutput>(api.deleteStack({
        componentName: awsComponent.componentName,
        stackName: stack.stackName,
      }));

      getStackEvents();
    } catch (e) {
      if (!(e as any).isCanceled) {
        console.error(e);
        setError({ isError: true, errorMsg: `Unexpected error occurred while deleting the deployment: ${e}` });
      }
    }
  };

  const handleStopPolling = async () => {
    setPollingEnabled(false);
    setPolling(false);
  };

  const handleRefresh = async () => {
    refresh();
  };

  const getStatus = (stackStatus: string): string => {
    if (stackStatus === 'CREATE_COMPLETE' || stackStatus === 'UPDATE_COMPLETE') {
      return "LIVE";
    }
    return stackStatus;
  }

  if (error.isError) {
    return <InfoCard title="Application State">{error.errorMsg}</InfoCard>;
  }

  return (
    <InfoCard title="Application State">
      <CardContent>
        {polling &&
          <>
            {events.length > 0 &&
              <>
                Latest events as of {formatWithTime(new Date())}...
                <br /><br />
                <table>
                  <tbody>
                    <tr>
                      <td style={eventStyle}><b>Action</b></td>
                      <td style={eventStyle}><b>Resource Type</b></td>
                      <td><b>Resource ID</b></td>
                    </tr>
                    {events.map((stackEvent, i) => <tr key={i}>
                      <td style={eventStyle}>{stackEvent.action}</td>
                      <td style={eventStyle}>{stackEvent.resourceType}</td>
                      <td>{stackEvent.logicalResourceId}</td>
                    </tr>)}
                  </tbody>
                </table>
                <br />
              </>
            }
            <>Polling for updates...</>
            <br />
            <Button
              sx={{ mr: 2 }}
              variant="outlined"
              size="small"
              disabled={false}
              onClick={handleStopPolling}
            >
              Stop Polling
            </Button>
          </>
        }
        {!polling &&
          <Grid container direction="column" rowSpacing={2}>
            <Grid container>
              <Grid item xs={4}>
                <Typography sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>Status</Typography>
                <Typography sx={{ mt: 1 }}>{getStatus(stack.stackDeployStatus)}</Typography>
              </Grid>
              <Divider orientation="vertical" flexItem sx={{ mr: '-1px' }} />
              <Grid item zeroMinWidth xs={4} sx={{ pl: 1, pr: 1 }}>
                <Typography sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>Created At</Typography>
                <Typography sx={{ mt: 1 }}>
                  {stack.creationTime || ''}
                </Typography>
              </Grid>
              <Divider orientation="vertical" flexItem sx={{ mr: '-1px' }} />
              <Grid item xs={4} sx={{ pl: 1 }}>
                <Typography sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>Last Updated</Typography>
                <Typography sx={{ mt: 1 }}>
                  {stack.lastUpdatedTime || ''}
                </Typography>
              </Grid>
            </Grid>
            <Grid item>
              <Button
                sx={{ mr: 2 }}
                variant="outlined"
                size="small"
                disabled={false}
                onClick={handleRefresh}
              >
                Refresh
              </Button>
              <Button
                sx={{ mr: 2 }}
                variant="outlined"
                size="small"
                disabled={stack.stackDeployStatus === 'UNSTAGED'}
                onClick={handleStartDeployment}
              >
                {stack.stackDeployStatus.includes('STAGED') ? 'Deploy' : 'Update'} App
              </Button>
              <Button
                sx={{ mr: 2 }}
                variant="outlined"
                size="small"
                disabled={!stack.stackDeployStatus.includes('COMPLETE')}
                onClick={handleStopApp}
              >
                Delete App
              </Button>
            </Grid>
          </Grid>
        }

      </CardContent>
    </InfoCard>
  );
};

export const AppStateCard = () => {
  const awsAppLoadingStatus = useAsyncAwsApp();

  if (awsAppLoadingStatus.loading) {
    return <LinearProgress />
  } else if (awsAppLoadingStatus.component) {
    const env = awsAppLoadingStatus.component.currentEnvironment as AWSServerlessAppDeploymentEnvironment;
    const input = {
      awsComponent: awsAppLoadingStatus.component,
      s3BucketName: env.app.s3BucketName!,
      stack: env.app.appStack,
      refresh: awsAppLoadingStatus.refresh!,
    };

    return <OpaAppStateOverview input={input} />
  } else {
    return <EmptyState missing="data" title="No state data to show" description="State data would show here" />
  }
};
