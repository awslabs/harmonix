// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { InvokeCommandOutput } from '@aws-sdk/client-lambda';
import { GetParameterCommandOutput } from '@aws-sdk/client-ssm';
import { AWSComponent, AWSEKSAppDeploymentEnvironment, AppState, AppStateType, KeyValue, getGitCredentailsSecret } from '@aws/plugin-aws-apps-common-for-backstage';
import { Entity } from '@backstage/catalog-model';
import { EmptyState, InfoCard } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { useEntity } from '@backstage/plugin-catalog-react';
import { LinearProgress, Table, TableBody, TableCell, TableRow } from '@material-ui/core';
import { Unstable_NumberInput as NumberInput } from '@mui/base/Unstable_NumberInput';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { Button, CardContent, Divider, Grid, Typography } from '@mui/material';
import { styled } from '@mui/system';
import React, { useEffect, useRef, useState } from 'react';
import { opaApiRef } from '../../api';
import { base64PayloadConvert } from '../../helpers/util';
import { useAsyncAwsApp } from '../../hooks/useAwsApp';
import { useCancellablePromise } from '../../hooks/useCancellablePromise';

const blue = {
  100: '#daecff',
  200: '#b6daff',
  300: '#66b2ff',
  400: '#3399ff',
  500: '#007fff',
  600: '#0072e5',
  700: '#0059B2',
  800: '#004c99',
};

const grey = {
  50: '#F3F6F9',
  100: '#E5EAF2',
  200: '#DAE2ED',
  300: '#C7D0DD',
  400: '#B0B8C4',
  500: '#9DA8B7',
  600: '#6B7A90',
  700: '#434D5B',
  800: '#303740',
  900: '#1C2025',
};

const StyledInputRoot = styled('div')(
  ({ theme }) => `
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 400;
  color: ${theme.palette.mode === 'dark' ? grey[300] : grey[500]};
  display: flex;
  flex-flow: row nowrap;
  justify-content: center;
  align-items: center;
`,
);

const StyledInput = styled('input')(
  ({ theme }) => `
  font-size: 0.875rem;
  font-family: inherit;
  font-weight: 400;
  line-height: 1.375;
  color: ${theme.palette.mode === 'dark' ? grey[300] : grey[900]};
  background: ${theme.palette.mode === 'dark' ? grey[900] : '#fff'};
  border: 1px solid ${theme.palette.mode === 'dark' ? grey[700] : grey[200]};
  box-shadow: 0px 2px 4px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0, 0.5)' : 'rgba(0,0,0, 0.05)'
    };
  border-radius: 8px;
  margin: 0 8px;
  padding: 10px 12px;
  outline: 0;
  min-width: 0;
  width: 4rem;
  text-align: center;

  &:hover {
    border-color: ${blue[400]};
  }

  &:focus {
    border-color: ${blue[400]};
    box-shadow: 0 0 0 3px ${theme.palette.mode === 'dark' ? blue[700] : blue[200]};
  }

  &:focus-visible {
    outline: 0;
  }
`,
);

const StyledButton = styled('button')(
  ({ theme }) => `
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.875rem;
  box-sizing: border-box;
  line-height: 1.5;
  border: 1px solid;
  border-radius: 999px;
  border-color: ${theme.palette.mode === 'dark' ? grey[800] : grey[200]};
  background: ${theme.palette.mode === 'dark' ? grey[900] : grey[50]};
  color: ${theme.palette.mode === 'dark' ? grey[200] : grey[900]};
  width: 32px;
  height: 32px;
  display: flex;
  flex-flow: row nowrap;
  justify-content: center;
  align-items: center;
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 120ms;

  &:hover {
    cursor: pointer;
    background: ${theme.palette.mode === 'dark' ? blue[700] : blue[500]};
    border-color: ${theme.palette.mode === 'dark' ? blue[500] : blue[400]};
    color: ${grey[50]};
  }

  &:focus-visible {
    outline: 0;
  }

  &.increment {
    order: 1;
  }
`,
);

const OpaAppStateOverview = ({
  input: { env, entity, awsComponent }
}: {
  input: {
    env: AWSEKSAppDeploymentEnvironment,
    entity: Entity,
    awsComponent: AWSComponent
  }
}) => {

  const api = useApi(opaApiRef);
  const [appStateData, setAppStateData] = useState<AppState[]>([]);
  const [variablesJson, setVariablesJson] = useState<any>({});
  const [appStarted, setAppStarted] = useState(false);
  const [appStopped, setAppStopped] = useState(false);
  const [clusterNameState, setClusterNameState] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ isError: boolean; errorMsg: string | null }>({ isError: false, errorMsg: null });
  const { cancellablePromise } = useCancellablePromise({ rejectOnCancel: true });
  const timerRef = useRef<any>(null);
  const repoInfo = awsComponent.getRepoInfo();
  
  // Namespace-bound application admin role (not cluster admin role)
  const appAdminRoleArn = env.app.appAdminRoleArn;

  const kubectlLambdaArn = env.entities.envProviderEntity?.metadata["kubectlLambdaArn"]?.toString() || "";
  let clusterNameParam, clusterName: string;

  async function fetchAppConfig() {
    if (!clusterName) {
      // console.log(`getting cluster name`);
      clusterNameParam = await cancellablePromise<GetParameterCommandOutput>(
        api.getSSMParameter({ ssmParamName: env.clusterName })
      );
      clusterName = clusterNameParam.Parameter?.Value?.toString().split('/')[1].toString() || "";
    } else {
      // console.log(`clusterName was already cached when getting app config`);
    }

    setClusterNameState(clusterName);

    const bodyParamVariables = {
      RequestType: "Create",
      ResourceType: "Custom::AWSCDK-EKS-KubernetesObjectValue",
      ResourceProperties: {
        TimeoutSeconds: "5",
        ClusterName: clusterName,
        RoleArn: appAdminRoleArn,
        ObjectNamespace: env.app.namespace,
        InvocationType: 'RequestResponse',
        ObjectType: "configmaps",
        ObjectLabels: `app.kubernetes.io/env=${env.environment.name},app.kubernetes.io/name=${entity.metadata.name}`,
        JsonPath: "@"
      }
    };

    // console.log(`calling lambda to get configs`);
    const resultsVariables = await cancellablePromise<InvokeCommandOutput>(
      api.invokeLambda({
        functionName: kubectlLambdaArn,
        actionDescription: `Fetch app configs for namespace ${env.app.namespace}`,
        body: JSON.stringify(bodyParamVariables)
      })
    );
    // console.log(`got configs`);

    try {
      if (resultsVariables?.Payload) {
        const payloadVariablesString = base64PayloadConvert(resultsVariables.Payload as Object);
        const payloadVariablesJson = JSON.parse(payloadVariablesString);

        if (payloadVariablesJson?.Data?.Value) {
          const variablesJson = JSON.parse(payloadVariablesJson.Data.Value);
          // console.log(variablesJson);
          return variablesJson;
        } else {
          return {};
        }

      }

    } catch (err) {
      console.log(err);
      throw Error("Can't parse json response");
    }

  }

  async function fetchAppState() {

    if (!clusterName) {
      // console.log(`getting cluster name`);
      clusterNameParam = await cancellablePromise<GetParameterCommandOutput>(
        api.getSSMParameter({ ssmParamName: env.clusterName })
      );
      // console.log(`DONE getting cluster name`);
      clusterName = clusterNameParam.Parameter?.Value?.toString().split('/')[1].toString() || "";
      // console.log(`clusterName is ${clusterName}`);
    }

    const bodyParam = {
      RequestType: "Create",
      ResourceType: "Custom::AWSCDK-EKS-KubernetesObjectValue",
      ResourceProperties: {
        TimeoutSeconds: "5",
        ClusterName: clusterName,
        RoleArn: appAdminRoleArn,
        ObjectNamespace: env.app.namespace,
        InvocationType: 'RequestResponse',
        ObjectType: "deployments",
        ObjectLabels: `app.kubernetes.io/env=${env.environment.name},app.kubernetes.io/name=${entity.metadata.name}`,
        JsonPath: "@"
      }
    };

    //  console.log(bodyParam)
    // console.log(`calling lambda to get manifests`);
    const results = await cancellablePromise<InvokeCommandOutput>(
      api.invokeLambda({
        functionName: kubectlLambdaArn,
        actionDescription: `Fetch deployments for namespace ${env.app.namespace}`,
        body: JSON.stringify(bodyParam)
      })
    );
    // console.log(`got manifests`);

    try {
      if (results?.Payload) {
        const payloadString = base64PayloadConvert(results.Payload as Object);
        const payloadJson = JSON.parse(payloadString);
        if (payloadJson?.Data?.Value) {
          const deploymentJson = JSON.parse(payloadJson.Data.Value).items;
          // console.log(deploymentJson);
          return deploymentJson;
        } else {
          return {};
        }
      }

    } catch (err) {
      console.log(err);
      throw Error("Can't parse json response");
    }
  }

  const getDeploymentEnvVars = (deploymentName: string): KeyValue[] => {
    if (!appStateData || !variablesJson) {
      return [];
    }

    const configMapName = appStateData.filter(appState => appState.appID === deploymentName)[0].stateObject.spec.template.spec.containers[0]?.envFrom?.[0]?.configMapRef?.name;

    if (!configMapName) {
      return [];
    }

    const configMap = variablesJson.items.filter((candidateMap: any) => candidateMap.metadata.name === configMapName)?.[0];

    if (!configMap) {
      return [];
    }

    const variables: KeyValue[] = [];
    Object.keys(configMap.data).forEach((key: string, index: number) => {
      variables.push({
        id: `${index}`,
        key: key.toString(),
        value: configMap.data[key].toString()
      })
    });
    return variables;
  };

  const parseState = (deploymentsJson: any): AppState[] => {
    // parse response JSON

    let deploymentsState: AppState[] = []
    try {

      Object.keys(deploymentsJson).forEach(key => {
        const deploymentJson = deploymentsJson[key];

        const updatedReplicas = Number.parseInt(deploymentJson.status.updatedReplicas) || 0;
        const appRunning = Number.parseInt(deploymentJson.status.readyReplicas) || 0;

        const pending = Math.abs(appRunning - updatedReplicas);

        let appStateDescription;
        if (pending) {
          appStateDescription = AppStateType.UPDATING;
        } else {
          appStateDescription = appRunning > 0 ? AppStateType.RUNNING : AppStateType.STOPPED;
        }

        const appState: AppState = {
          appID: deploymentJson.metadata.name,
          appState: appStateDescription,
          deploymentIdentifier: deploymentJson.metadata.uid,
          desiredCount: Number.parseInt(deploymentJson.spec.replicas) || 0,
          pendingCount: pending,
          runningCount: appRunning,
          lastStateTimestamp: new Date(deploymentJson.status.conditions[0].lastUpdateTime),
          stateObject: deploymentJson
        }

        deploymentsState.push(appState);
      })

    } catch (err) {
      console.log(err);
    }
    return deploymentsState || [];
  }

  async function getData(appStateResults?: any) {

    let isCanceled = false;
    let isError = false;
    let deploymentsJson;
    let variablesJson;
    try {
      if (appStateResults) {
        // console.log(`reusing appStateResults`);
      }

      deploymentsJson = appStateResults ? appStateResults : await fetchAppState();    // returns array of deployments
      variablesJson = await fetchAppConfig();     // return the configMaps for the app
    } catch (e) {
      if ((e as any).isCanceled) {
        isCanceled = true;
        // console.log(`got cancellation in getData`);
      } else {
        isError = true;
        console.error(e);
        setError({ isError: true, errorMsg: `Unexpected error occurred while retrieving event data: ${e}` });
      }

    }

    if (!isCanceled && !isError) {
      const states = parseState(deploymentsJson);

      setAppStateData(states);
      setVariablesJson(variablesJson);
    }

  }

  useEffect(() => {
    setAppStateData([]);                               // reset existing state
    getData()
      .then(() => {
        setLoading(false);
        setError({ isError: false, errorMsg: '' });
      })
      .catch(e => {
        setLoading(false);
        setError({ isError: true, errorMsg: `Unexpected error occurred while retrieving app data: ${e}` });
      });

    return () => {
      // prevent sleeping while-loops from continuing
      setAppStarted(true);
      setAppStopped(true);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        // console.log(`Clearing Timeout`);
      }

    }
  }, []);

  function sleep(ms: number) {
    return new Promise(resolve => {

      const resolveHandler = () => {
        clearTimeout(timerRef.current);
        resolve(null);
      }
      timerRef.current = setTimeout(resolveHandler, ms);
    });
  }

  const handleStartTask = async (appState: AppState) => {

    setLoading(true);

    // console.log(`calling lambda to set replicas to > 0, clusterNameState is ${clusterNameState}`);

    let isCanceled = false;
    try {
      await cancellablePromise(
        api.updateEKSApp({
          actionDescription: `Starting app in environment ${env.environment.name}`,
          envName: env.environment.name,
          cluster: clusterNameState,
          kubectlLambda: env.entities.envProviderEntity?.metadata["kubectlLambdaArn"]?.toString() || "",
          lambdaRoleArn: appAdminRoleArn,
          gitAdminSecret: getGitCredentailsSecret(repoInfo),
          updateKey: 'spec.replicas',
          updateValue: appState.desiredCount || 1,
          repoInfo,
        })
      );
      // console.log(`DONE setting replicas to > 0`);
    } catch (e) {
      if ((e as any).isCanceled) {
        isCanceled = true;
      } else {
        console.error(e);
        setError({ isError: true, errorMsg: `Unexpected error occurred while starting app: ${e}` });
        setLoading(false);
      }
    }

    let deploymentsJson: any;
    let count = 0;
    let localAppStarted = false;
    // console.log(`isCanceled is ${isCanceled} and localAppStarted is ${localAppStarted} and appStarted is ${appStarted}`);
    while (!isCanceled && !appStarted && !localAppStarted) {

      // console.log(`sleeping waiting for app to be started, localAppStarted is ${localAppStarted} and appStarted is ${appStarted}`);
      await sleep(5000);
      // console.log(`awake ${count}, will now check app state`);
      count++;

      try {
        // console.log("start fetching app state");
        deploymentsJson = await fetchAppState();
        // console.log("DONE fetching app state");
        Object.keys(deploymentsJson).forEach(key => {
          const currState = deploymentsJson[key];
          if (currState.metadata.uid === appState.deploymentIdentifier) {
            if (Number.parseInt(currState.status.readyReplicas) > 0) {
              setAppStateData([]);                               // reset existing state
              setAppStarted(true);
              localAppStarted = true;
              // console.log(`setting appStarted to true`);
            }
          }
        });

        if (localAppStarted || appStarted) {
          // console.log(`breaking from while loop since app was started`);
          break;
        } else {
          // console.log(`not breaking from while loop since appStarted is falsy`);
        }

      } catch (e) {
        if ((e as any).isCanceled) {
          isCanceled = true;
        } else {
          console.error(e);
          setError({ isError: true, errorMsg: `Unexpected error occurred while retrieving app state: ${e}` });
          setAppStarted(true);
          localAppStarted = true;
          // console.log(`setting appStarted to true`);
          setLoading(false);
        }
        break;
      }
    }

    if (!isCanceled && localAppStarted) {
      await getData(deploymentsJson);
      setLoading(false);
    }
  };

  const handleStopTask = async (appState: AppState) => {
    setLoading(true);

    // console.log(`calling lambda to set replicas to 0 when clusterNameState is ${clusterNameState}`);

    let isCanceled = false;
    try {
      await cancellablePromise(
        api.updateEKSApp({
          actionDescription: `Stopping app in environment ${env.environment.name}`,
          envName: env.environment.name,
          cluster: clusterNameState,
          kubectlLambda: env.entities.envProviderEntity?.metadata["kubectlLambdaArn"]?.toString() || "",
          lambdaRoleArn: appAdminRoleArn,
          gitAdminSecret: getGitCredentailsSecret(repoInfo),
          updateKey: 'spec.replicas',
          updateValue: 0,
          repoInfo,
        })
      );
      // console.log(`DONE setting replicas to 0`);
    } catch (e) {
      if ((e as any).isCanceled) {
        isCanceled = true;
      } else {
        console.error(e);
        setError({ isError: true, errorMsg: `Unexpected error occurred while stopping app: ${e}` });
        setLoading(false);
      }
    }

    let count = 0;
    let localAppStopped = false;
    // console.log(`isCanceled is ${isCanceled} and localAppStopped is ${localAppStopped} and appStoped is ${appStopped}`);
    while (!isCanceled && !appStopped && !localAppStopped) {
      // console.log(`sleeping ${count} - waiting for app to be stopped, localAppStopped is ${localAppStopped} and appStoped is ${appStopped}`);
      await sleep(7000);
      // console.log(`DONE sleeping - app is stopped`);
      count++;

      try {
        // console.log("fetching app state");
        const deploymentsJson = await fetchAppState();
        // console.log("DONE - fetching app state");

        Object.keys(deploymentsJson).forEach(key => {
          const currState = deploymentsJson[key];
          if (currState.metadata.uid === appState.deploymentIdentifier) {
            if (!currState.status.readyReplicas || Number.parseInt(currState.status.readyReplicas) === 0) {
              appState.appState = AppStateType.STOPPED
              appState.runningCount = 0
              localAppStopped = true;
              setAppStopped(true);
              setLoading(false);
              // console.log(`setting appStopped to true and loading to false`);
            }
          }
        });

        if (localAppStopped || appStopped) {
          // console.log(`breaking from while loop since app was stopped`);
          break;
        }

      } catch (e) {
        if ((e as any).isCanceled) {
          isCanceled = true;
        } else {
          console.error(e);
          setError({ isError: true, errorMsg: `Unexpected error occurred while retrieving app state: ${e}` });
          setLoading(false);
          setAppStopped(true);
          localAppStopped = true;
          // console.log(`setting appStopped to true and loading to false`);
        }
        break;
      }

    }
  };

  const EnvVars = ({ appID }: { appID: string }) => {

    const envVarArr = getDeploymentEnvVars(appID);

    if (envVarArr && envVarArr.length) {
      return (
        <>
          {envVarArr.map((envVar) => (
            <TableRow key={envVar.id}>
              <TableCell><Typography sx={{ fontWeight: 'bold' }}>{envVar.key}</Typography></TableCell>
              <TableCell width="55%">{envVar.value}</TableCell>
            </TableRow>
          ))}
        </>
      );
    } else {
      return (
        <TableRow key="clusterName">
          <TableCell id='noneConfigured' width="30%">None configured</TableCell>
          <TableCell id='providerName'></TableCell>
        </TableRow>
      );
    }
  };

  const DeploymentCard = ({ deploymentState, index, total }: { deploymentState: AppState, index: number, total: number }) => {

    return (
      <>
        <Grid container sx={{ marginBottom: 2 }}>
          <Grid item xs={6}>
            <Typography sx={{ textTransform: 'uppercase', fontWeight: 'bold', paddingBottom: '10px' }}>Deployment {index > 1 ? index : ""}</Typography>
            <div>
              {
                deploymentState?.appState ?
                  (
                    <Grid container>
                      <Grid item xs={1}></Grid>
                      <Grid item xs={11}>
                        <Table size='small' padding='none'>
                          <TableBody>
                            <TableRow key="deploymentName" >
                              <TableCell id='name' width="30%"><Typography sx={{ fontWeight: 'bold' }}>Name</Typography></TableCell>
                              <TableCell id='providerName'>{deploymentState.stateObject.metadata.name}</TableCell>
                            </TableRow>
                            <TableRow key="status" >
                              <TableCell id='status' width="30%"><Typography sx={{ fontWeight: 'bold' }}>Status</Typography></TableCell>
                              <TableCell id='appStatus'>{deploymentState?.appState ? deploymentState?.appState : 'Not Running'}</TableCell>
                            </TableRow>
                            <TableRow key="pods" >
                              <TableCell id='id' width="30%"><Typography sx={{ fontWeight: 'bold' }}>Pods</Typography></TableCell>
                              <TableCell id='providerName'>{deploymentState?.runningCount + "/" + deploymentState?.desiredCount}{deploymentState?.pendingCount ? ` (${deploymentState?.pendingCount} Pending)` : ''}</TableCell>
                            </TableRow>
                            <TableRow key="lastUpdated" >
                              <TableCell id='id' width="30%"><Typography sx={{ fontWeight: 'bold' }}>Last Updated</Typography></TableCell>
                              <TableCell id='providerName'>{deploymentState?.lastStateTimestamp ? deploymentState?.lastStateTimestamp.toString() : ''}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </Grid>
                    </Grid>
                  ) : <></>
              }
            </div>
          </Grid>
          <Divider orientation="vertical" flexItem sx={{ mr: '-1px' }} />
          <Grid item zeroMinWidth xs={6} sx={{ pl: 1, pr: 1 }}>
            <Typography sx={{ textTransform: 'uppercase', fontWeight: 'bold', paddingBottom: '10px' }}>Environment Variables</Typography>
            <Grid container>
              <Grid item xs={1}></Grid>
              <Grid item xs={11}>
                <Table size='small' padding='none'>
                  <TableBody>
                    <EnvVars appID={deploymentState.appID as string} />
                  </TableBody>
                </Table>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
        <Grid container>
          <Grid item xs={12}>
            {
              index === total && deploymentState?.appState === AppStateType.STOPPED ?
                (
                  <div style={{ float: 'left', marginRight: '10px' }}>
                    <NumberInput
                      placeholder="Number of pods"
                      defaultValue={1}
                      onChange={(_event, val) => deploymentState.desiredCount = val || 0}
                      min={0}
                      max={10}
                      slots={{
                        root: StyledInputRoot,
                        input: StyledInput,
                        incrementButton: StyledButton,
                        decrementButton: StyledButton,
                      }}
                      slotProps={{
                        incrementButton: {
                          children: <AddIcon fontSize="small" />,
                          className: 'increment',
                        },
                        decrementButton: {
                          children: <RemoveIcon fontSize="small" />,
                        },
                      }}
                    />
                  </div>) :
                <></>
            }
            {
              index === total ?
                (
                  <>
                    <Button
                      sx={{ mr: 2 }}
                      variant="outlined"
                      size="small"
                      disabled={deploymentState?.appState !== AppStateType.STOPPED ? true : false}
                      onClick={() => handleStartTask(deploymentState)}
                    >
                      Start
                    </Button>
                    <Button
                      sx={{ mr: 2 }}
                      variant="outlined"
                      size="small"
                      disabled={(deploymentState?.appState === AppStateType.STOPPED ? true : false)}
                      onClick={() => handleStopTask(deploymentState)}
                    >
                      Stop
                    </Button>
                    <Typography fontStyle={'italic'} fontSize={'12px'} sx={{ mt: 1 }}> **Changes to your application state will be applied directly to the cluster and not to the source code repository</Typography>
                  </>) : <></>
            }
          </Grid>
        </Grid>
      </>
    )
  }

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
        <Grid container>
          <Grid item xs={5}>
            <Typography sx={{ textTransform: 'uppercase', fontWeight: 'bold', paddingBottom: '10px' }}>Cluster Info</Typography>
            <Grid container>
              <Grid item xs={1}></Grid>
              <Grid item xs={11}>
                <Table size='small' padding='none'>
                  <TableBody>
                    <TableRow key="clusterName" >
                      <TableCell id='id' width="30%"><Typography sx={{ fontWeight: 'bold' }}>Cluster Name</Typography></TableCell>
                      <TableCell id='providerName'>{clusterNameState}</TableCell>
                    </TableRow>
                    <TableRow key="namespace" >
                      <TableCell id='id' width="30%"><Typography sx={{ fontWeight: 'bold' }}>Namespace</Typography></TableCell>
                      <TableCell id='providerName'>{env.app.namespace}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
        <Grid container direction="column" rowSpacing={2} sx={{ marginTop: 2 }}>
          {
            appStateData.length ?
              appStateData.map((state, index, array) => {
                return (<DeploymentCard key={state.deploymentIdentifier} deploymentState={state} index={++index} total={array.length} />)
              }) : <>No Deployments Found</>
          }
        </Grid>
      </CardContent>
    </InfoCard>
  );
};

export const K8sAppStateCard = () => {
  const { entity } = useEntity();
  const awsAppLoadingStatus = useAsyncAwsApp();

  if (awsAppLoadingStatus.loading) {
    return <LinearProgress />
  } else if (awsAppLoadingStatus.component) {
    let input;
    if (awsAppLoadingStatus.component.componentSubType === "aws-eks") {
      const env = awsAppLoadingStatus.component.currentEnvironment as AWSEKSAppDeploymentEnvironment;
      input = {
        env,
        entity,
        awsComponent: awsAppLoadingStatus.component
      };
      return <OpaAppStateOverview input={input} />
    } else {
      return <EmptyState missing="data" title="Can't render EKS app state card" description="Missing supported spec.subType" />
    }

  } else {
    return <EmptyState missing="data" title="No state data to show" description="State data would show here" />
  }
};
