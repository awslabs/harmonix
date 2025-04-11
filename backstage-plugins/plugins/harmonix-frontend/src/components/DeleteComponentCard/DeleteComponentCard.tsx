// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AWSComponent, AWSComponentType, AWSEKSAppDeploymentEnvironment, AWSResourceDeploymentEnvironment, ComponentStateType, GenericAWSEnvironment, IRepositoryInfo, getGitCredentailsSecret } from "@aws/plugin-aws-apps-common-for-backstage";
import { Entity } from "@backstage/catalog-model";
import { EmptyState, InfoCard } from "@backstage/core-components";
import { useApi } from "@backstage/core-plugin-api";
import { CatalogApi, catalogApiRef, useEntity } from "@backstage/plugin-catalog-react";
import { Button, CardContent, Grid, LinearProgress } from "@material-ui/core";
import { Alert, AlertTitle, Typography } from "@mui/material";
import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';
import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { OPAApi, opaApiRef } from '../../api';
import { APP_SUBTYPE } from "../../helpers/constants";
import { sleep } from "../../helpers/util";
import { useAsyncAwsApp } from "../../hooks/useAwsApp";

const DeleteAppPanel = ({
  input: { awsComponent, entity, catalogApi, api }
}: { input: { awsComponent: AWSComponent; entity: Entity; catalogApi: CatalogApi; api: OPAApi } }) => {

  const [disabled, setDisabled] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [isDeleteSuccessful, setIsDeleteSuccessful] = useState(false);
  const [deleteResultMessage, setDeleteResultMessage] = useState("");
  const navigate = useNavigate();

  const appIACType = entity.metadata["iacType"]?.toString();
  const appSubtype = entity.spec?.["subType"]?.toString() || 'undefinedSubtype';
  // console.log(appIACType);
  const repoInfo = awsComponent.getRepoInfo();

  const handleCloseAlert = () => {
    setDeleteResultMessage("");
  };

  const deleteRepo = (repoInfo:IRepositoryInfo) => {
    api.deleteRepository({
      repoInfo,
      gitAdminSecret: getGitCredentailsSecret(repoInfo)
    }).then(_results => {
      // console.log(_results);
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
    // console.log("Deleting entity from backstage catalog");
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

  // Ensure that k8s objects are deleted in an appropriate order
  const getK8sKindSortOrder = (k8sObject: any): number => {
    let order;
    switch (k8sObject.kind) {
      case "Ingress":
        order = 0;
        break;
      case "Service":
        order = 1;
        break;
      case "Deployment":
        order = 2;
        break;
      case "ConfigMap":
        order = 4;
        break;
      case "RoleBinding":
        order = 999;
        break;
      default:
        order = 3;
    }
    return order;
  };

  const deleteK8sApp = async (env: AWSEKSAppDeploymentEnvironment) => {
    let k8sManifests = await api.getEKSAppManifests({
      envName: env.environment.name,
      gitAdminSecret: getGitCredentailsSecret(repoInfo),
      repoInfo
    });

    // Removing objects without a namespace set since the app admin role
    // does not have permissions to delete them.
    k8sManifests = (k8sManifests as any[])
      .filter(k8sObject => !!k8sObject.metadata?.namespace)
      .sort((a, b) => getK8sKindSortOrder(a) - getK8sKindSortOrder(b));

    if (!k8sManifests.length) {
      return;
    }

    const kubectlLambdaArn = env.entities.envProviderEntity?.metadata["kubectlLambdaArn"]?.toString() || "";
    const kubectlLambdaRoleArn = env.app.appAdminRoleArn;

    const clusterNameParam = await api.getSSMParameter({ ssmParamName: env.clusterName });
    const clusterName = clusterNameParam.Parameter?.Value?.toString().split('/')[1].toString() || "";

    const bodyParamVariables = {
      RequestType: "Delete",
      ResourceType: "Custom::AWSCDK-EKS-KubernetesResource",
      ResourceProperties: {
        ClusterName: clusterName,
        RoleArn: kubectlLambdaRoleArn,
        Manifest: JSON.stringify(k8sManifests),
      }
    };

    const invokeLambdaResponse = await api.invokeLambda({
      functionName: kubectlLambdaArn,
      actionDescription: `Delete app from namespace ${env.app.namespace}`,
      body: JSON.stringify(bodyParamVariables)
    });

    if (invokeLambdaResponse.FunctionError) {
      throw new Error('Failed to delete app from Kubernetes cluster.');
    }

    return invokeLambdaResponse;
  }

  const deleteAppFromSingleProvider = async (appName: string, env: GenericAWSEnvironment) => {
    const backendParamsOverrides = {
      appName: appName,
      awsAccount: env.providerData.accountNumber,
      awsRegion: env.providerData.region,
      prefix: env.providerData.prefix,
      providerName: env.providerData.name
    };

    if (awsComponent.componentState===ComponentStateType.CLOUDFORMATION)
    {
      let stackName = ""
      if (awsComponent.componentType === AWSComponentType.AWSResource) {
        const resourceEnv = env as AWSResourceDeploymentEnvironment
        stackName = resourceEnv.resource.cloudFormationStackName
      }
      else if (awsComponent.componentType === AWSComponentType.AWSApp) {
        stackName = env.app.cloudFormationStackName;
      }

      // For EKS apps, we need to delete the application from the Kubernetes cluster
      if (APP_SUBTYPE.EKS === appSubtype) {
        await deleteK8sApp(awsComponent.currentEnvironment as AWSEKSAppDeploymentEnvironment);
      }

      const results = api.deleteStack({componentName:awsComponent.componentName, stackName, backendParamsOverrides });
      return results;
    }
    else if (awsComponent.componentState === ComponentStateType.TERRAFORM_CLOUD)
    {
      // Use the workspace directy to invoke delete if provisioning happens in TF Cloud 
      // awsComponent.currentEnvironment.providerData.terraformWorkspace

      const repoInfo = awsComponent.getRepoInfo();
      const params = {
        backendParamsOverrides,
        repoInfo,
        gitAdminSecret: getGitCredentailsSecret(repoInfo),
        envName: env.environment.name
      }
      const results = api.deleteTFProvider(params);
      return results;

    } else if (awsComponent.componentState === ComponentStateType.TERRAFORM_AWS)
    {
        // rely on pipeline to remove the terraform IAC based on bucket and table - can be resloved from the repo. 
       // awsComponent.currentEnvironment.providerData.terraformStateBucket
       // awsComponent.currentEnvironment.providerData.terraformStateTable

        // For EKS apps, we need to delete the application from the Kubernetes cluster
        if (APP_SUBTYPE.EKS === appSubtype) {
          await deleteK8sApp(awsComponent.currentEnvironment as AWSEKSAppDeploymentEnvironment);
        }
  
        const repoInfo = awsComponent.getRepoInfo();
        const params = {
          backendParamsOverrides,
          repoInfo,
          gitAdminSecret: getGitCredentailsSecret(repoInfo),
          envName: env.environment.name
        }
        const results = api.deleteTFProvider(params);
        return results;
    } else
    {
      throw Error("Error: Can't delete component, Unsupported State.")
    }
  }

  const deleteSecret = (secretName: string) => {
    api.deletePlatformSecret({ secretName }).then(_result => {
      // console.log(_result);
      setDeleteResultMessage("Secret Deleted.")
    }).catch(error => {
      setSpinning(false);
      setIsDeleteSuccessful(false);
      setDeleteResultMessage(error.toString());
    })

  }

  // const handleDeleteRepo = async () => {
  //   // Delete the repo now.
  //   deleteRepo(repoInfo)
  //   setDeleteResultMessage("Redirect to home ....")
  //   await sleep(4000);
  //   navigate('/')
  // }

  const handleClickDelete = async () => {
    if (confirm('Are you sure you want to delete this app?')) {
      setSpinning(true);
      deleteAppFromSingleProvider(awsComponent.componentName, awsComponent.currentEnvironment).then(async _results => {
        // console.log(_results)
        setSpinning(false);
        setIsDeleteSuccessful(true);
        setDeleteResultMessage("App delete initiated.")
        //now update repo to remove environment
        // api.InitiateGitDelete
        await sleep(2000);
        // awsComponent.currentEnvironment.providerData.name

      }).catch(error => {
        console.log(error);
        setSpinning(false);
        setIsDeleteSuccessful(false);
        setDeleteResultMessage(error.toString());
        return;
      })

    } else {
      // Do nothing!
    }

  };

  const handleClickDeleteAll = async () => {
    if (confirm('Are you sure you want to delete this app?')) {

      const deployedEnvironments = Object.keys(awsComponent.environments);
      deployedEnvironments.forEach(env => {
        const environmentToRemove: GenericAWSEnvironment = awsComponent.environments[env];
        // remove environment x 
        deleteAppFromSingleProvider(awsComponent.componentName, environmentToRemove).then(async _results => {
          // console.log(_results)
          setIsDeleteSuccessful(true);
          setDeleteResultMessage(`CloudFormation delete stack on provider ${env} initiated.`)
          await sleep(2000);

        }).catch(error => {
          console.log(error);
          setSpinning(false);
          setIsDeleteSuccessful(false);
          setDeleteResultMessage(error.toString());
          return;
        })
      })
      if (appIACType === "cdk") {
        await sleep(2000);
        // Delete the repo now.
        deleteRepo(repoInfo);
        await sleep(2000);
        if (awsComponent.componentType === AWSComponentType.AWSApp) {
          deleteSecret(entity.metadata['repoSecretArn']?.toString() || "");
        }
        deleteFromCatalog();
        setSpinning(false);
        await sleep(2000);
        setDeleteResultMessage("Redirect to home ....");
        navigate('/');
        setDisabled(false);
      }
      else if (appIACType === "terraform") {
        await sleep(2000);
        setSpinning(false);
        setDisabled(false);
        setDeleteResultMessage("Once the pipeline finish executing you may click Delete Repository");
      }

    } else {
      // Do nothing!
    }
  };

  return (
    <InfoCard title="Delete Component">
      <CardContent>
        <Grid>
          <Grid container spacing={2}>
            <Grid item zeroMinWidth xs={12}>
              <Typography sx={{ fontWeight: 'bold' }}>Delete this component from current environment</Typography>
            </Grid>
            <Grid item zeroMinWidth xs={12}>
              <Typography noWrap>
                {/* <DeleteIcon fontSize="large" /> */}
                <Button variant="contained" style={{ backgroundColor: 'red' }} onClick={handleClickDelete} disabled={disabled}>Delete</Button>
              </Typography>
            </Grid>
          </Grid>
          <Grid container spacing={2}>
            <Grid item zeroMinWidth xs={12}>
              <Typography sx={{ fontWeight: 'bold' }}>Delete this component and all of its resources</Typography>
            </Grid>
            <Grid item zeroMinWidth xs={12}>
              <Typography noWrap>
                {/* <DeleteIcon fontSize="large" /> */}
                <Button variant="contained" style={{ backgroundColor: 'red' }} onClick={handleClickDeleteAll} disabled={disabled}>Delete from all environments</Button>
              </Typography>
            </Grid>
          </Grid>
          <Grid item zeroMinWidth xs={12}>
            {isDeleteSuccessful && deleteResultMessage && (
              <Alert id="alertGood" sx={{ mt: 2, mb: 2 }} severity="success" onClose={handleCloseAlert}>
                <AlertTitle>Success</AlertTitle>
                <strong>{entity.metadata.name}</strong> was successfully deleted!
                {!!deleteResultMessage && (<><br /><br />{deleteResultMessage}</>)}
              </Alert>
            )}
            {!isDeleteSuccessful && deleteResultMessage && (
              <Alert id="alertBad" sx={{ mt: 2, mb: 2 }} severity="error" onClose={handleCloseAlert}>
                <AlertTitle>Error</AlertTitle>
                Failed to delete <strong>{entity.metadata.name}</strong> .
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

export const DeleteComponentCard = () => {
  const awsAppLoadingStatus = useAsyncAwsApp();
  const { entity } = useEntity();
  const catalogApi = useApi(catalogApiRef);
  const api = useApi(opaApiRef);

  if (awsAppLoadingStatus.loading) {
    return <LinearProgress />
  } else if (awsAppLoadingStatus.component) {
    // console.log(awsAppLoadingStatus.component)
    const input = {
      awsComponent: awsAppLoadingStatus.component,
      entity,
      catalogApi,
      api
    };
    return <DeleteAppPanel input={input} />
  } else {
    return <EmptyState missing="data" title="No state data to show" description="State data would show here" />
  }
};
