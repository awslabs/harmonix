// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { ReactNode, createContext } from 'react';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import {
  catalogApiRef,
  useEntity,
} from '@backstage/plugin-catalog-react';
import useAsyncRetry from 'react-use/lib/useAsyncRetry';
import { Entity, EntityRelation, parseEntityRef } from '@backstage/catalog-model';
// TODO: consider moving AWSEnvironmentEntityV1 AWSEnvironmentProviderEntityV1 to common plugin
import { AWSEnvironmentEntityV1, AWSEnvironmentProviderEntityV1 } from '@aws/plugin-aws-apps-common-for-backstage';
import { AWSComponent, AWSComponentType, AWSDeploymentEnvironment, AWSECSAppDeploymentEnvironment, AWSEKSAppDeploymentEnvironment, AWSResourceDeploymentEnvironment, AWSServerlessAppDeploymentEnvironment, AwsDeploymentEnvironments, CloudFormationStack, ComponentStateType, GenericAWSEnvironment, IRepositoryInfo, getRepoInfo } from '@aws/plugin-aws-apps-common-for-backstage';
import { ProviderType, ExtraStackDeployStatus, DeployStackStatus } from '../helpers/constants';
import { opaApiRef } from '../api';
import { formatWithTime } from '../helpers/date-utils';

interface EnvEntityMap {
  [key: string]: Entity[];
}

/** @public */
export type AwsComponentHookLoadingStatus = {
  component?: AWSComponent;
  loading: boolean;
  error?: Error;
  refresh?: VoidFunction;
};

type EntityNameAndRef = {
  envName: string;
  targetRef: string;
}
type EntityLookupResponse = EntityNameAndRef & {
  entity: Entity | undefined;
}
type MultiEntityNameAndRef = {
  envName: string;
  targetRefs: string[];
}

// Private / internal variables
let _app_name: string | null = null;
let _change_to_env_name: string | null = null;
let _change_to_env_provider_name: string | null = null;
let _envProviderEntityMap: EnvEntityMap | null = null;
let _envEntities: EntityLookupResponse[] | null = null;
let _refresh: VoidFunction;

// Private / internal function
const _setCurrentProvider = (envName: string, providerName: string) => {
  _change_to_env_name = envName;
  _change_to_env_provider_name = providerName;
  _refresh(); // calls getData function
};

/** 
 * Loads AWS App deployment data and returns response that will allow
 * consumers to get the data and see whether it is still being loaded
 * or if there was an error loading it.
 * @public
*/
export const useAwsComponentFromContext = (): AwsComponentHookLoadingStatus => {

  const { entity } = useEntity();
  const catalogApi = useApi(catalogApiRef);
  const config = useApi(configApiRef);
  const api = useApi(opaApiRef);
  api.setPlatformParams(entity.metadata.name, config.getString('backend.platformRegion'));
  if (entity.metadata.name != _app_name)
  {
    // switched app reset references of drop down env selector
    _envProviderEntityMap = null;
    _change_to_env_name = null;
    _change_to_env_provider_name = null;
  }
  _app_name=entity.metadata.name
  // Look up environment and environment provider entities from the catalog
  async function getCatalogData(): Promise<EnvEntityMap> {
    if (!entity.relations) {
      throw new Error(`Entity ${entity.metadata.name} has no relations`);
    }
    const envRefs: EntityRelation[] = entity.relations
      .filter(relation => parseEntityRef(relation.targetRef).kind === 'awsenvironment')
    if (!envRefs.length) {
      throw new Error(`Entity ${entity.metadata.name} does not have an AWS environment.`);
    }

    // Get all application environment entities
    const envEntities: EntityLookupResponse[] = await Promise.all(
      envRefs.map(async (relation: EntityRelation): Promise<EntityLookupResponse> => {
        const envEntity = await catalogApi.getEntityByRef(relation.targetRef);
        return {
          envName: envEntity?.metadata.name || parseEntityRef(relation.targetRef).name,
          targetRef: relation.targetRef,
          entity: envEntity,
        }
      })
    );

    // Get the targetRef for each environment's providers
    const envProviderRefs = envEntities
      .filter(envLookupResponse => !!envLookupResponse.entity?.relations)
      .map(envLookupResponse => {
        const envProviderRefs: EntityRelation[] | undefined =
          envLookupResponse.entity?.relations?.filter(
            relation => parseEntityRef(relation?.targetRef).kind === 'awsenvironmentprovider')
        return {
          envName: envLookupResponse.envName,
          targetRefs: envProviderRefs ? envProviderRefs.map(ref => ref.targetRef) : []
        }
      })
      .filter(envProviderMap => !!envProviderMap.targetRefs.length)
      .reduce((acc: EntityNameAndRef[], envProviderEntities: MultiEntityNameAndRef) => {
        envProviderEntities.targetRefs.forEach(targetRef => {
          acc.push({ envName: envProviderEntities.envName, targetRef });
        });
        return acc;
      }, []);

    // Get a map of environment provider entities. The map key is the environment name. The
    // map value is an array of provider entities for that environment. Note, each environment
    // can have more than one provider entity in a multi-region or multi-account scenario.
    const envProviderEntityMap: EnvEntityMap = (await Promise.all(
      envProviderRefs.map(async (providerRef): Promise<EntityLookupResponse> => {
        const envProviderEntity = await catalogApi.getEntityByRef(providerRef.targetRef);
        return {
          envName: providerRef.envName,
          targetRef: providerRef.targetRef,
          entity: envProviderEntity,
        }
      })
    )).reduce((acc, envProviderEntity) => {
      const typedAcc: EnvEntityMap = acc;
      if (!typedAcc[envProviderEntity.envName]) {
        return {
          ...typedAcc, [envProviderEntity.envName]: [envProviderEntity.entity]
        };
      } else {
        typedAcc[envProviderEntity.envName].push(envProviderEntity.entity!);
        return typedAcc;
      }
    }, {});

    // set values into cache
    _envEntities = envEntities;
    _envProviderEntityMap = envProviderEntityMap;

    return envProviderEntityMap;
  }

  function getProviderAppData(deployEnv: AWSDeploymentEnvironment): any {
    const appData = entity.metadata["appData"] as any;
    const envAppData = appData[deployEnv.environment.name] as any;
    return envAppData[deployEnv.providerData.name] as any;
  }

  async function populateServerlessState(svAppDeployEnv: AWSServerlessAppDeploymentEnvironment): Promise<void> {

    let defaultDeployStatus = ExtraStackDeployStatus.UNSTAGED;
    const providerAppData = getProviderAppData(svAppDeployEnv);
    const bucketName = providerAppData["BuildBucketName"];

    try {
      await api.doesS3FileExist({ bucketName, fileName: 'packaged.yaml' });
      defaultDeployStatus = ExtraStackDeployStatus.STAGED;
      // console.log('S3 HEAD response');
      // console.log(JSON.stringify(templateFileExistsResponse, null, 2));

    } catch (e) {
      console.error(e);
    }

    const appStack: CloudFormationStack = {
      stackName: providerAppData["AppStackName"] || "",
      stackDeployStatus: defaultDeployStatus,
    }

    svAppDeployEnv.app = {
      logGroupNames: [],
      resourceGroupArn: providerAppData["AppResourceGroup"] || "",
      cloudFormationStackName: providerAppData["StackName"] || "",
      appStack,
      s3BucketName: bucketName,
      links: []
    }

    try {

      if (defaultDeployStatus === ExtraStackDeployStatus.STAGED) {
        const stackDetails = await api.getStackDetails({ stackName: appStack.stackName });
        // console.log("Stack Details");
        // console.log(JSON.stringify(stackDetails, null, 2));

        appStack.stackDeployStatus = (stackDetails.StackStatus || ExtraStackDeployStatus.STAGED) as DeployStackStatus;
        appStack.creationTime = stackDetails.CreationTime ? formatWithTime(new Date(stackDetails.CreationTime)) : undefined;
        appStack.lastUpdatedTime = stackDetails.LastUpdatedTime ? formatWithTime(new Date(stackDetails.LastUpdatedTime)) : undefined;

        if (stackDetails.Outputs) {
          const logGroupsArrayOutput = stackDetails.Outputs.filter(output => output.OutputKey === 'LogGroupsArray')[0] ?? null;
          if (logGroupsArrayOutput) {
            svAppDeployEnv.app.logGroupNames.push(...JSON.parse(logGroupsArrayOutput.OutputValue as string));
          }

          const apiUrlOutput = stackDetails.Outputs.filter(output => output.OutputKey === 'ApiGatewayEndpointWithPath')[0] ?? null;
          if (apiUrlOutput) {
            svAppDeployEnv.app.links = [
              {
                title: "Go to app",
                url: apiUrlOutput.OutputValue as string,
                // icon: 'kind:api'
              }
            ];
          }
        }
      }
    } catch (e) {
      console.log('Failed to get stack. This is expected if the stack has not yet been deployed');
      console.error(e);
    }

  }

  function populateEcsState(ecsAppDeployEnv: AWSECSAppDeploymentEnvironment, providerEntity: Entity): void {
    ecsAppDeployEnv.clusterName = providerEntity.metadata['clusterName']?.toString() || "";

    const providerAppData = getProviderAppData(ecsAppDeployEnv);

    ecsAppDeployEnv.app = {
      ecrArn: providerAppData["EcrRepositoryArn"] || "",
      logGroupName: providerAppData["TaskLogGroup"] || "",
      resourceGroupArn: providerAppData["AppResourceGroup"] || "",
      serviceArn: providerAppData["EcsServiceArn"] || "",
      taskDefArn: providerAppData["EcsTaskDefinitionArn"] || "",
      cloudFormationStackName: providerAppData["StackName"] || "",
      taskExecutionRoleArn: providerAppData["TaskExecutionRoleArn"] || "",
      links: [
        {
          title: "Go to app",
          url: providerAppData["AlbEndpoint"] || "",
          // icon: 'kind:api'
        }
      ]
    }
  }

  function populateEksState(eksAppDeployEnv: AWSEKSAppDeploymentEnvironment, providerEntity: Entity): void {
    eksAppDeployEnv.clusterName = providerEntity.metadata['clusterName']?.toString() || "";

    const providerAppData = getProviderAppData(eksAppDeployEnv);

    eksAppDeployEnv.app = {
      appAdminRoleArn: providerAppData["AppAdminRoleArn"] as string || "",
      ecrArn: providerAppData["EcrRepositoryArn"] as string || "",
      namespace: providerAppData["Namespace"] as string || "",

      // Must match Fluent Bit configurations. See "log_group_template" setting in the EKS provider IaC.
      logGroupName: providerAppData["LogGroup"] || `/aws/apps/${eksAppDeployEnv.providerData.prefix}-${eksAppDeployEnv.providerData.name}/${providerAppData["Namespace"]}`,
      
      resourceGroupArn: providerAppData["AppResourceGroup"] || "",
      cloudFormationStackName: providerAppData["StackName"] || "",
      links: []
    }

    if (providerAppData["AlbEndpoint"]) {
      eksAppDeployEnv.app.links.push({
        title: "Go to app",
        url: providerAppData["AlbEndpoint"] || "",
        // icon: 'kind:api'
      });
    }

  }

  function populateResourceState(resourceDeployEnv: AWSResourceDeploymentEnvironment): void {
    resourceDeployEnv.resource.resourceName = entity.metadata.name

    const providerAppData = getProviderAppData(resourceDeployEnv);

    resourceDeployEnv.resource.arn = providerAppData['Arn']?.toString() || "";
    resourceDeployEnv.resource.resourceGroupArn = providerAppData['ResourceGroup']?.toString() || "";
    resourceDeployEnv.resource.cloudFormationStackName = providerAppData['StackName']?.toString() || "";
  }

  // Retrieve AWS App Deployment data from the back end
  async function getData(): Promise<AWSComponent> {

    // We load catalog data if we've never loaded it before for the current
    // application entity or if we want to refresh the data.
    // We do NOT load catalog data again if we only want to switch the current
    // environment provider

    //TODO: Feature optimization to cache app related data - make sure the key of the app matches. multi -app-> multi-env->multi-providers..
    //if (!_envEntities) {
      await getCatalogData();
//    }

    const envEntities = _envEntities!;
    const envProviderEntityMap = _envProviderEntityMap!;

    const componentType = getComponentType(entity);
    // Construct environment and components data types from environment/provider entities
    const deployEnvs: AwsDeploymentEnvironments = envEntities.reduce((acc, envEntity) => {
      const envProviders = envProviderEntityMap[envEntity.envName];
      let envProvider;

      if (envEntity.envName === _change_to_env_name) {
        envProvider = envProviders
          .filter((providerEntity: Entity) => providerEntity.metadata.name === _change_to_env_provider_name)[0];
  
        if (!envProvider) {
          console.error(`Could not filter based on env name ${_change_to_env_name} and provider name ${_change_to_env_provider_name}`)
          envProvider = envProviders[0];
        }

      } else {
        envProvider = envProviders[0];
      }

      const awsDeploymentEnvironment: AWSDeploymentEnvironment = {
        environment: {
          accountType: envEntity.entity?.metadata['envTypeAccount']?.toString() || "",
          category: envEntity.entity?.metadata['category']?.toString() || "",
          classification: envEntity.entity?.metadata['classification']?.toString() || "",
          description: envEntity.entity?.metadata['description']?.toString() || "",
          envType: envEntity.entity?.metadata['environmentType']?.toString() || "",
          level: parseInt(envEntity.entity?.metadata['level']?.toString() || "0", 10),
          name: envEntity.entity?.metadata['name'].toString() || "",
          regionType: envEntity.entity?.metadata['envTypeRegion']?.toString() || "",
        },
        providerData: {
          accountNumber: envProvider.metadata['awsAccount']?.toString() || "",
          region: envProvider.metadata['awsRegion']?.toString() || "",
          prefix: envProvider.metadata['prefix']?.toString() || "",
          auditTable: envProvider.metadata['auditTable']?.toString() || "",
          description: envProvider.metadata['description']?.toString() || "",
          name: envProvider.metadata['name'],
          operationRoleSsmKey: envProvider.metadata['operationRole']?.toString() || "",
          provisioningRoleSsmKey: envProvider.metadata['provisioningRole']?.toString() || "",
          providerType: envProvider.metadata['envType']?.toString().toLowerCase() || "",
          vpcSsmKey: envProvider.metadata['vpc']?.toString() || "",
          cloudFormationStackName: envProvider.metadata['StackName']?.toString() || "",
          terraformWorkspace: envProvider.metadata['TerraformWorkspace']?.toString() || "",
          terraformStateBucket: envProvider.metadata['TerraformStateBucket']?.toString() || "",
          terraformStateTable: envProvider.metadata['TerraformStateTable']?.toString() || "",
        },
        entities: {
          envEntity: envEntity.entity as AWSEnvironmentEntityV1,
          envProviderEntity: envProvider as AWSEnvironmentProviderEntityV1
        },
        app: {
          cloudFormationStackName: "",   // will be updated later below when app data is fetched from entity
          links: []
        },
        resource: {}
      }

      // now adjust more specific provider data types 
      const providerType = envEntity.entity?.metadata['environmentType']?.toString().toLowerCase() || "N/A";

      if (providerType === "N/A") {
        throw new Error("Environment Entity not set properly - please configure environmentType");
      }

      if (providerType === ProviderType.ECS && componentType === "aws-app") {
        populateEcsState(awsDeploymentEnvironment as AWSECSAppDeploymentEnvironment, envProvider);
      } else if (providerType === ProviderType.EKS && componentType === "aws-app") {
        populateEksState(awsDeploymentEnvironment as AWSEKSAppDeploymentEnvironment, envProvider);
      } else if (providerType === ProviderType.SERVERLESS && componentType === "aws-app") {
        // Must handle this later, since it will require async calls that cannot be made here
      } else if (componentType === "aws-resource") {
        populateResourceState(awsDeploymentEnvironment as AWSResourceDeploymentEnvironment);
        if (entity.metadata["resourceType"] === "aws-rds") {
          (awsDeploymentEnvironment as AWSResourceDeploymentEnvironment).resource.resourceType = "database";
        }
      }

      return {
        ...acc,
        [envEntity.envName.toLowerCase()]: awsDeploymentEnvironment
      };
    }, {});

    // now build an AWS component matching the app and the deployed environment
    function getComponentType(entity: Entity): AWSComponentType {
      if (entity.kind==="AWSEnvironment") {
        return AWSComponentType.AWSEnvironment
      } else if (entity.kind==="AWSEnvironmentProvider") {
        return AWSComponentType.AWSProvider
      }
      let componentType: string = entity.spec?.type?.toString() || ""
      if (componentType === 'aws-resource') {
        return AWSComponentType.AWSResource
      } else if (componentType === 'aws-app') {
        return AWSComponentType.AWSApp
      } else if (componentType === 'aws-organization') {
        return AWSComponentType.AWSOrganization
      } else {
        return AWSComponentType.Default
      }
    }

    function getLowerEnvironment(envs: AwsDeploymentEnvironments): GenericAWSEnvironment {
      let lowest: GenericAWSEnvironment = Object.values(envs).at(0)!;
      Object.values(envs).forEach(env => {
        if (lowest && lowest.environment.level > env.environment.level)
          lowest = env;
      })
      return lowest;
    }
    const getRepoInfoImpl = () : IRepositoryInfo => {
      return getRepoInfo(entity);
    }
    
    const getComponentStateType = () : ComponentStateType => {
      if (entity.metadata['componentState'] ===undefined)
      {
        throw Error ("Error: Entity of type Component must have componentState in metadata.")
      }
      const componentState = entity.metadata['componentState']?.toString() || "";
      switch (componentState)
      {
       case "cloudformation":
        return ComponentStateType.CLOUDFORMATION
       case "terraform-cloud":
        return ComponentStateType.TERRAFORM_CLOUD
       case "terraform-aws":
          return ComponentStateType.TERRAFORM_AWS;
       default:
        throw Error (`Unsupported component state  ${componentState}`);
      }
    }

    const awsComponent: AWSComponent = {
      componentName: entity.metadata['name'],
      componentType,
      componentState: getComponentStateType(),
      componentSubType: entity.spec? entity.spec['subType']!.toString(): "",
      iacType: entity.metadata['iacType']?.toString() || "",
      repoSecretArn: entity.metadata['repoSecretArn']?.toString() || "",
      getRepoInfo:getRepoInfoImpl,
      platformRegion: config.getString('backend.platformRegion'),
      environments: deployEnvs,
      currentEnvironment: !!_change_to_env_name ? deployEnvs[_change_to_env_name.toLowerCase()] : getLowerEnvironment(deployEnvs),
      setCurrentProvider: (envName: string, providerName: string) => {
        _setCurrentProvider(envName, providerName);
      }
    };

    if (!awsComponent.currentEnvironment) {
      if (_change_to_env_name) {
        console.log(`Attempting to set current environment to ${_change_to_env_name}`);
      }
      console.log(`Failed to retrieve currentEnvironment from data set:`);
      console.log(deployEnvs);
    }

    api.setBackendParams({
      appName: awsComponent.componentName,
      awsAccount: awsComponent.currentEnvironment.providerData.accountNumber,
      awsRegion: awsComponent.currentEnvironment.providerData.region,
      prefix: awsComponent.currentEnvironment.providerData.prefix,
      providerName: awsComponent.currentEnvironment.providerData.name
    });

    if (awsComponent.currentEnvironment.providerData.providerType === ProviderType.SERVERLESS && componentType === "aws-app") {
      await populateServerlessState(awsComponent.currentEnvironment as AWSServerlessAppDeploymentEnvironment);
    }
    if (awsComponent.currentEnvironment.providerData.providerType === ProviderType.GENAI_SERVERLESS && componentType === "aws-app") {
      // consider populating different GenAI-related data here
      await populateServerlessState(awsComponent.currentEnvironment as AWSServerlessAppDeploymentEnvironment);
    }

    return awsComponent as AWSComponent;
  }

  // Execute the App deployment data retrieval
  const {
    value: component,
    error,
    loading,
    retry: refresh,
  } = useAsyncRetry(
    () => getData(),
    [catalogApi, entity],
  );

  _refresh = refresh;

  return { component, loading, error, refresh };
};

// Utilize React context to hold app deployment data retrieval status
const AwsAppContext = createContext<AwsComponentHookLoadingStatus>({ loading: true });

/**
 * Properties for the AsyncAwsAppProvider component.
 *
 * @public
 */
export interface AsyncAwsAppProviderProps {
  children: ReactNode;
  component?: AWSComponent;
  loading: boolean;
  error?: Error;
  refresh?: VoidFunction;
}

/**
 * Provides AWS deployments to be picked up by the `useAsyncAwsApp` hook.
 *
 * @public
 */
export const AsyncAwsAppProvider = (props: AsyncAwsAppProviderProps) => {
  const { children, component, loading, error, refresh } = props;
  const value = { component, loading, error, refresh };
  return (
    <AwsAppContext.Provider value={value}>
      {children}
    </AwsAppContext.Provider>
  );
};

/**
 * Properties for the AwsAppProvider component.
 *
 * @public
 */
export interface AwsAppProviderProps {
  children: ReactNode;
  component?: AWSComponent;
}

/**
 * Provides an app to be picked up by the `useAsyncAwsApp` hook.
 *
 * @public
 */
export const AwsAppProvider = (props: AwsAppProviderProps) => (
  <AsyncAwsAppProvider
    component={props.component}
    loading={!Boolean(props.component)}
    error={undefined}
    refresh={undefined}
    children={props.children}
  />
);

/**
 * Grab the current app's AWS deployment data, provides loading state 
 * and errors, and the ability to refresh.
 *
 * @public
 */
export function useAsyncAwsApp(): AwsComponentHookLoadingStatus {
  return React.useContext(AwsAppContext);
}

export const MISSING = 'missing';
