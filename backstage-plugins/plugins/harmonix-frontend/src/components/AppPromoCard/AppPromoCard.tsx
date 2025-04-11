// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AWSComponent, AWSProviderParams, AwsDeploymentEnvironments, getGitCredentailsSecret } from '@aws/plugin-aws-apps-common-for-backstage';
import { CompoundEntityRef, Entity, EntityRelation, parseEntityRef } from '@backstage/catalog-model';
import { EmptyState, InfoCard, } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { CatalogApi, catalogApiRef, useEntity } from '@backstage/plugin-catalog-react';
import { Button, CardContent, FormControl, FormHelperText, Grid, InputLabel, LinearProgress, MenuItem, Select } from '@material-ui/core';
import InfoIcon from '@mui/icons-material/Info';
import { Alert, AlertTitle, Typography } from '@mui/material';
import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import React, { ChangeEvent, useEffect, useState } from 'react';
import { opaApiRef } from '../../api';
import { ProviderType } from '../../helpers/constants';
import { useAsyncAwsApp } from '../../hooks/useAwsApp';
import { AwsEksEnvPromoDialog } from './AwsEksEnvPromoDialog';

const AppPromoCard = ({
  input: { awsComponent, catalogApi, appEntity },
}: {
  input: { awsComponent: AWSComponent; catalogApi: CatalogApi, appEntity: Entity };
}) => {
  const [envChoices, setEnvChoices] = useState<Entity[]>([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [openEksDialog, setOpenEksDialog] = useState(false);
  const [isPromotionSuccessful, setIsPromotionSuccessful] = useState(false);
  const [promotedEnvName, setPromotedEnvName] = useState("");
  const [promoteResultMessage, setPromoteResultMessage] = useState("");
  const [suggestedEksNamespace, setSuggestedEksNamespace] = useState("");
  const [suggestedIamRoleArn, setSuggestedIamRoleArn] = useState("");

  const api = useApi(opaApiRef);
  
  function getHighestLevelEnvironment(currentEnvironments: AwsDeploymentEnvironments) {
    let highestLevel = 1;
    Object.keys(currentEnvironments).forEach(env => {
      if (highestLevel <= currentEnvironments[env].environment.level) {
        highestLevel = currentEnvironments[env].environment.level;

      }
    })
    return highestLevel;
  }

  function getApplicableEnvironments(
    catalogEntities: Entity[],
    envType: string,
    currentEnvironments: AwsDeploymentEnvironments): Entity[] {

    // by now, we got applicable environments for the same runtime and that we have yet to deploy on.
    const lowestEnvironmentLevel = getHighestLevelEnvironment(currentEnvironments);

    const currentEnvKeys = Object.keys(currentEnvironments);

    return catalogEntities
      .filter(en => {
        return (
          en.metadata["environmentType"] === envType &&
          !currentEnvKeys.includes(en.metadata.name) &&
          Number.parseInt(en.metadata["level"]?.toString()!) >= lowestEnvironmentLevel
        )
      })
      .sort(
        (a, b) => Number.parseInt(a.metadata['level']?.toString()!) - Number.parseInt(b.metadata['level']?.toString()!),
      );
  };

  const filterExpression = {
    'kind': "awsenvironment",
    'metadata.environmentType': awsComponent.currentEnvironment.environment.envType
    // 'spec.system': component.currentEnvironment.environment.system, TODO: when system is implemented filter on similar system.
  };

  useEffect(() => {
    catalogApi.getEntities({ filter: filterExpression }).then(entities => {
      const data = getApplicableEnvironments(entities.items, awsComponent.currentEnvironment.environment.envType, awsComponent.environments);
      setEnvChoices(data);
      if (data && data[0]) {
        setSelectedItem(data[0].metadata.name);
      } else {
        setDisabled(true);
      }
    });
  }, []);

  const handleChange = (event: ChangeEvent<{ name?: string; value: unknown; }>) => {
    setSelectedItem((event.target.value as string))
  };

  async function getParameters(envProviderEntity: Entity): Promise<{ [key: string]: string; }> {
    //For the current provider - set the API to the appropriate provider target

    const backendParamsOverrides = {
      appName: awsComponent.componentName,
      awsAccount: envProviderEntity.metadata['awsAccount']?.toString() || "",
      awsRegion: envProviderEntity.metadata['awsRegion']?.toString() || "",
      prefix: envProviderEntity.metadata['prefix']?.toString() || "",
      providerName: envProviderEntity.metadata.name
    };

    const envType = envProviderEntity.metadata['envType']?.toString().toLowerCase();
    if (envType === ProviderType.ECS) {

      const metaVpc = "vpc";
      const metaRole = "provisioningRole";
      const metaCluster = "clusterName";
      const metadataKeys = [metaVpc, metaCluster, metaRole];

      const ssmValues = await Promise.all(metadataKeys.map(async (metaKey) => {
        const paramKey = envProviderEntity.metadata[metaKey]?.toString() || metaKey;
        const value = (await api.getSSMParameter({ ssmParamName: paramKey, backendParamsOverrides })).Parameter?.Value || "";
        return value;
      }));

      let parametersMap = {
        TARGET_VPCID: ssmValues[metadataKeys.indexOf(metaVpc)],
        TARGET_ECS_CLUSTER_ARN: ssmValues[metadataKeys.indexOf(metaCluster)],
        ENV_ROLE_ARN: ssmValues[metadataKeys.indexOf(metaRole)],
        // 'TARGET_ENV_AUDIT': auditTable
      };
      return parametersMap;

    } else if (envType === ProviderType.EKS) {

      const metaVpc = "vpc";
      const metaRole = "provisioningRole";
      const metaCluster = "clusterName";
      const metadataKeys = [metaVpc, metaCluster, metaRole];

      const ssmValues = await Promise.all(metadataKeys.map(async (metaKey) => {
        const paramKey = envProviderEntity.metadata[metaKey]?.toString() || metaKey;
        const value = (await api.getSSMParameter({ ssmParamName: paramKey, backendParamsOverrides })).Parameter?.Value || "";
        return value;
      }));

      let parametersMap = {
        TARGET_VPCID: ssmValues[metadataKeys.indexOf(metaVpc)],
        TARGET_EKS_CLUSTER_ARN: ssmValues[metadataKeys.indexOf(metaCluster)],
        ENV_ROLE_ARN: ssmValues[metadataKeys.indexOf(metaRole)],
        TARGET_KUBECTL_LAMBDA_ARN: envProviderEntity.metadata.kubectlLambdaArn as string,
        TARGET_KUBECTL_LAMBDA_ROLE_ARN: envProviderEntity.metadata.clusterAdminRole as string,
      };
      return parametersMap;

    } else if (envType === ProviderType.SERVERLESS) {

      const metaVpc = "vpc";
      const metaRole = "provisioningRole";
      const vpcParam = envProviderEntity.metadata[metaVpc]?.toString() || "";
      const metaPubNet = `${vpcParam}/public-subnets`;
      const metaPrivNet = `${vpcParam}/private-subnets`;
      const metadataKeys = [metaVpc, metaRole, metaPubNet, metaPrivNet];

      const ssmValues = await Promise.all(metadataKeys.map(async (metaKey) => {
        const paramKey = envProviderEntity.metadata[metaKey]?.toString() || metaKey;
        const value = (await api.getSSMParameter({ ssmParamName: paramKey, backendParamsOverrides })).Parameter?.Value || "";
        return value;
      }));

      let parametersMap = {
        TARGET_VPCID: ssmValues[metadataKeys.indexOf(metaVpc)],
        ENV_ROLE_ARN: ssmValues[metadataKeys.indexOf(metaRole)],
        TARGET_PRIVATE_SUBNETS: ssmValues[metadataKeys.indexOf(metaPrivNet)],
        TARGET_PUBLIC_SUBNETS: ssmValues[metadataKeys.indexOf(metaPubNet)],
        // TARGET_ENV_AUDIT: auditTable
      };
      return parametersMap;
    }
    else {
      throw new Error(`UNKNOWN PROVIDER TYPE" ${envType}`);
    }
  }

  type EnvironmentProviders = {
    providers: AWSProviderParams[];
  }

  async function getEnvProviders(): Promise<EnvironmentProviders> {
    let envProviders: EnvironmentProviders = { providers: [] };

    const selectedEnv = await catalogApi.getEntities({ filter: { 'kind': "awsenvironment", 'metadata.name': selectedItem } });
    const envEntity = selectedEnv.items[0];

    const envRequiresManualApproval = !!envEntity.metadata['deploymentRequiresApproval'];

    const envProviderRefs: EntityRelation[] | undefined = envEntity.relations?.filter(
      relation => parseEntityRef(relation?.targetRef).kind === 'awsenvironmentprovider')!;

    const providerEntities = await Promise.all(envProviderRefs.map(async (entityRef: { targetRef: string | CompoundEntityRef; }) => {
      const entity = await catalogApi.getEntityByRef(entityRef.targetRef);
      return entity;
    }));

    await Promise.all(providerEntities.map(async (et) => {
      const providerResolvedData = await getParameters(et!);
      envProviders.providers.push(
        {
          environmentName: envEntity.metadata.name,
          envRequiresManualApproval,
          providerName: et?.metadata.name || '',
          awsAccount: et?.metadata['awsAccount']?.toString() || '',
          awsRegion: et?.metadata['awsRegion']?.toString() || '',
          prefix: et?.metadata['prefix']?.toString() || '',
          assumedRoleArn: et?.metadata['provisioningRole']?.toString() || '',
          parameters: providerResolvedData
        });
    }))

    return envProviders;
  }

  const handleCloseAlert = () => {
    setPromotedEnvName("");
  };

  const closeEksDialog = () => setOpenEksDialog(false);

  const submitNewEksEnvironmentHandler = (namespace: string, iamRoleArn: string, roleBehavior: string) => {
    // console.log(`CREATE ENV - namespace=${namespace}  roleBehavior=${roleBehavior} iamRoleArn=${iamRoleArn}`);
    createNewEnvironment({["NAMESPACE"]: namespace, ["APP_ADMIN_ROLE_ARN"]: iamRoleArn, ["K8S_IAM_ROLE_BINDING_TYPE"]: roleBehavior});
  };

  const createNewEnvironment = (extraParameters?: { [key: string]: string }) => {
    setSpinning(true);
    setPromotedEnvName("");

    // Build a list of environment variables required to invoke a job to promote the app
    let repoInfo = awsComponent.getRepoInfo();
    repoInfo.gitJobID = 'create-subsequent-environment-ci-config';
    getEnvProviders().then(envProviders => {
    
      const promoBody = {
        envName: selectedItem,
        envRequiresManualApproval: envProviders.providers[0].envRequiresManualApproval,
        repoInfo,
        gitAdminSecret:getGitCredentailsSecret(repoInfo),
        providersData: envProviders.providers
      };

      if (extraParameters) {
        Object.keys(extraParameters).forEach(key => {
          envProviders.providers.forEach(providerParams => {
            providerParams.parameters[key] = extraParameters[key];
          });
        });
      }

      // now call the API and submit the promo request
      api.promoteApp(promoBody).then(results => {
        setSpinning(false);
        setPromotedEnvName(selectedItem);
        if (results.message) {
          setPromoteResultMessage(results.message);
        }

        if (results.status === "SUCCESS") {
          // Remove promoted environment from dropdown
          const newEnvChoices = [...envChoices].filter(function (item) {
            return item.metadata.name !== selectedItem
          });

          if (newEnvChoices.length === 0) {
            setDisabled(true);
            setSelectedItem("");
          } else {
            setSelectedItem(newEnvChoices[0].metadata.name);
          }
          setEnvChoices(newEnvChoices);
          setIsPromotionSuccessful(true);

        } else {
          setIsPromotionSuccessful(false);
        }
      }).catch(err => {
        console.log(err);
        setSpinning(false);
        setPromotedEnvName(selectedItem);
        setIsPromotionSuccessful(false);
      })

    });
  };

  const handleClick = () => {
    if (!selectedItem) {
      alert('Select an Environment');
      return;
    }

    const envType = awsComponent.currentEnvironment.environment.envType.toLowerCase();

    // Show dialog asking user for additional EKS input
    if (envType === ProviderType.EKS) {

      if (appEntity.metadata.appData && Object.keys(appEntity.metadata.appData).length) {
        const firstEnv = Object.values(appEntity.metadata.appData)[0];
        const firstEnvProvider = Object.values(firstEnv)[0] as { Namespace: string; AppAdminRoleArn: string; };
        setSuggestedEksNamespace(`suggestions: "${appEntity.metadata.name}", "${appEntity.metadata.name}-${selectedItem}", "${firstEnvProvider.Namespace}"`);
        setSuggestedIamRoleArn(`suggestions: "${firstEnvProvider.AppAdminRoleArn}"`);
      }

      setOpenEksDialog(true);
      return;
    }

    createNewEnvironment();
  }

  return (
    <InfoCard title="Deployment Environments">
      <CardContent>
        <Grid>
          <Grid container spacing={2}>
            <Grid item zeroMinWidth xs={12}>
              {isPromotionSuccessful && !!promotedEnvName && (
                <Alert sx={{ mb: 2 }} severity="success" onClose={handleCloseAlert}>
                  <AlertTitle>Success</AlertTitle>
                  <strong>{promotedEnvName}</strong> was successfully scheduled for deployment!
                  {!!promoteResultMessage && (<><br /><br />{promoteResultMessage}</>)}
                </Alert>
              )}
              {!isPromotionSuccessful && !!promotedEnvName && (
                <Alert sx={{ mb: 2 }} severity="error" onClose={handleCloseAlert}>
                  <AlertTitle>Error</AlertTitle>
                  Failed to schedule <strong>{promotedEnvName}</strong> deployment.
                  {!!promoteResultMessage && (<><br /><br />{promoteResultMessage}</>)}
                </Alert>
              )}
              <Typography sx={{ fontWeight: 'bold' }}>
                Add Environment:
                <Tooltip title="Adding a deployment environment will update this app's CICD pipeline so that it will
                deploy the app to this environment.">
                  <IconButton>
                    <InfoIcon />
                  </IconButton>
                </Tooltip>
              </Typography>
            </Grid>
            <Grid item zeroMinWidth xs={12}>
              <FormControl>
                <InputLabel id="demo-simple-select-helper-label">Environments</InputLabel>
                <Select
                  labelId="demo-simple-select-helper-label"
                  id="demo-simple-select-helper"
                  value={selectedItem}
                  label="Environment"
                  disabled={disabled}
                  onChange={handleChange}
                >
                  {
                    envChoices.map(entity => {
                      const env = entity.metadata.name;
                      return (<MenuItem key={"ID" + env} value={env}>{env}</MenuItem>)
                    })
                  }
                </Select>
                <FormHelperText>Select the environment you wish to start deploying to.</FormHelperText>
              </FormControl>
            </Grid>
            <Grid item zeroMinWidth xs={12}>
              <Typography noWrap>
                <Button variant="contained" onClick={handleClick} disabled={disabled}>Add</Button>
              </Typography>
            </Grid>
          </Grid>
        </Grid>
        <Typography margin={'10px'}>
          <AwsEksEnvPromoDialog
            isOpen={openEksDialog}
            submitHandler={submitNewEksEnvironmentHandler}
            closeDialogHandler={closeEksDialog}
            environmentName={selectedItem}
            namespaceDefault={suggestedEksNamespace}
            iamRoleArnDefault={suggestedIamRoleArn}
          />
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

export const AppPromoWidget = () => {
  const awsAppLoadingStatus = useAsyncAwsApp();
  const catalogApi = useApi(catalogApiRef);
  const { entity } = useEntity();

  if (awsAppLoadingStatus.loading) {
    return <LinearProgress />;
  } else if (awsAppLoadingStatus.component) {
    const component = awsAppLoadingStatus.component
    const input = {
      awsComponent: component,
      catalogApi,
      appEntity: entity
    };

    return <AppPromoCard input={input} />;
  } else {
    return <EmptyState missing="data" title="Failed to load App Promo Card" description="Can't fetch data" />;
  }
};
