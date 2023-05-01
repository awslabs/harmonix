/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { ReactNode, createContext } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import {
  catalogApiRef,
  useEntity,
} from '@backstage/plugin-catalog-react';
import useAsyncRetry from 'react-use/lib/useAsyncRetry';
import { Entity, EntityRelation, parseEntityRef } from '@backstage/catalog-model';
import { bawsApiRef } from '../api';
import { DeployStackStatus, ExtraStackDeployStatus, APP_SUBTYPE } from '../helpers/constants';
import { formatWithTime } from '../helpers/date-utils';

interface EnvEntityMap {
  [key: string]: Entity[];
}

/** 
 * CloudFormation stack data
 * @public
*/
export type CloudFormationStack = {
  stackStatus: DeployStackStatus;
  cloudFormationStackName: string;
  creationTime?: string;
  lastUpdatedTime?: string;
}

/** 
 * Single environment data for AWS app deployment
 * @public
*/
export type AwsAppDeploymentEnvironment = {
  [key: string]: { // the key is the environment name (in all lower case)
    accountNumber: string;
    region: string;
    vpcSsmKey: string;
    ecs: {
      clusterName: string;
    };
    cloudFormation?: CloudFormationStack
    s3BucketName?: string;
    environment: {
      name: string;
      description: string;
      accountType: string;
      regionType: string;
      category: string;
      classification: string;
    };
    entities: {
      envEntity?: Entity
      envProviderEntities?: Entity[]
    };
  }
}

/** 
 * Deployment data for AWS apps
 * @public
*/
export type AwsAppDeployments = {
  componentName: string;
  ecs: {
    serviceArn: string;
    taskDefArn: string;
  },
  gitApp: string;
  gitHost: string;
  iacType: string;
  logGroupNames: string[];
  repoSecretArn: string;
  resourceGroupArn: string;
  environments: AwsAppDeploymentEnvironment
}

/** @public */
export type AwsAppLoadingStatus = {
  deployments?: AwsAppDeployments;
  loading: boolean;
  error?: Error;
  refresh?: VoidFunction;
};

type EntityLookupResponse = {
  envName: string;
  targetRef: string;
  entity: Entity | undefined;
}

/** 
 * Loads AWS App deployment data and returns response that will allow
 * consumers to get the data and see whether it is still being loaded
 * or if there was an error loading it.
 * @public
*/
export const useAwsAppFromContext = (): AwsAppLoadingStatus => {
  const { entity } = useEntity();
  const catalogApi = useApi(catalogApiRef);
  const bawsApi = useApi(bawsApiRef);

  // Retrieve AWS App Deployment data from the back end
  async function getData(): Promise<AwsAppDeployments> {

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

    // Get the targetRef for each environment's provider
    const envProviderRefs = envEntities
      .filter(envLookupResponse => !!envLookupResponse.entity?.relations)
      .map(envLookupResponse => {
        const envProviderRefs: EntityRelation[] | undefined =
          envLookupResponse.entity?.relations?.filter(
            relation => parseEntityRef(relation?.targetRef).kind === 'awsenvironmentprovider')

        return {
          envName: envLookupResponse.envName,
          targetRef: envProviderRefs ? envProviderRefs[0].targetRef : 'empty'
        }
      })
      .filter(envProviderMap => envProviderMap.targetRef !== 'empty')

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

    // Create a map of AWS environment app deployments where the map key is the environment name
    const deployEnvs: AwsAppDeploymentEnvironment = envEntities.reduce((acc, envEntity) => {

      const firstEnvProvider = envProviderEntityMap[envEntity.envName][0];

      return {
        ...acc,
        [envEntity.envName.toLowerCase()]: {
          accountNumber: firstEnvProvider.metadata['aws-account'],
          region: firstEnvProvider.metadata['aws-region'],
          vpcSsmKey: firstEnvProvider.metadata['vpc'],
          ecs: {
            clusterName: firstEnvProvider.metadata['cluster-name']?.toString().split('/')[2] + '-cluster',
          },
          environment: envEntity.entity?.metadata ? {
            name: envEntity.entity?.metadata['name'],
            description: envEntity.entity?.metadata['description'],
            accountType: envEntity.entity?.metadata['env-type-account'],
            regionType: envEntity.entity?.metadata['env-type-region'],
            category: envEntity.entity?.metadata['category'],
            classification: envEntity.entity?.metadata['classification'],
          } : null,
          entities: {
            envEntity: envEntity.entity,
            envProviderEntities: envProviderEntityMap[envEntity.envName]
          }
        }
      } as AwsAppDeploymentEnvironment;
    }, {} as AwsAppDeploymentEnvironment);

    let stackName: string | undefined;
    const subType = entity.metadata.annotations?.['aws.amazon.com/baws-component-subtype'] ?? APP_SUBTYPE.ECS;
    const logGroupNames: string[] = [];
    if (subType === APP_SUBTYPE.SERVERLESS_REST_API) {

      let defaultDeployStatus = ExtraStackDeployStatus.UNSTAGED;

      // TODO when we support multi-region/multi-account, we will need to run the following
      // for all environment providers and not just the first one
      const firstDeployEnvName = Object.keys(deployEnvs)[0];
      const { accountNumber, region } = deployEnvs[firstDeployEnvName];
      deployEnvs[firstDeployEnvName].s3BucketName = entity.metadata.annotations?.['aws.amazon.com/baws-s3-bucket-name']?.toString() ?? '';
      try {
        await bawsApi.doesS3FileExist({ bucketName: deployEnvs[firstDeployEnvName].s3BucketName!, fileName: 'packaged.yaml', account: accountNumber, region: region });
        defaultDeployStatus = ExtraStackDeployStatus.STAGED;
        // console.log('S3 HEAD response');
        // console.log(JSON.stringify(templateFileExistsResponse, null, 2));

      } catch (e) {
        console.error(e);
      }

      try {

        stackName = entity.metadata.annotations?.['aws.amazon.com/baws-cf-stack-name']?.toString() ?? '';
        deployEnvs[firstDeployEnvName].cloudFormation = {
          cloudFormationStackName: stackName,
          stackStatus: defaultDeployStatus
        };
        if (defaultDeployStatus === ExtraStackDeployStatus.STAGED) {
          const stackDetails = await bawsApi.getStackDetails({ stackName: stackName, account: accountNumber, region: region });
          // console.log("Stack Details");
          // console.log(JSON.stringify(stackDetails, null, 2));

          deployEnvs[firstDeployEnvName].cloudFormation!.stackStatus = (stackDetails.StackStatus || ExtraStackDeployStatus.STAGED) as DeployStackStatus;
          deployEnvs[firstDeployEnvName].cloudFormation!.creationTime = stackDetails.CreationTime ? formatWithTime(new Date(stackDetails.CreationTime)) : undefined;
          deployEnvs[firstDeployEnvName].cloudFormation!.lastUpdatedTime = stackDetails.LastUpdatedTime ? formatWithTime(new Date(stackDetails.LastUpdatedTime)) : undefined;

          if (stackDetails.Outputs) {
            const logGroupsArrayOutput = stackDetails.Outputs.filter(output => output.OutputKey === 'LogGroupsArray')[0] ?? null;
            if (logGroupsArrayOutput) {
              logGroupNames.push(...JSON.parse(logGroupsArrayOutput.OutputValue as string));
            }
          }
        }
      } catch (e) {
        console.log('Failed to get stack. This is expected if the stack has not yet been deployed');
        console.error(e);
      }

    } else {
      logGroupNames.push(entity.metadata?.annotations?.["aws.amazon.com/baws-task-log-group"] || MISSING);
    }

    const deployments: AwsAppDeployments = {
      componentName: entity.metadata.name,
      gitHost: entity.metadata?.annotations?.["gitlab.com/instance"] || MISSING,
      gitApp: entity.metadata?.annotations?.["gitlab.com/project-slug"] || MISSING,
      iacType: entity.metadata?.labels?.["aws-iacType"] || MISSING,
      logGroupNames,
      repoSecretArn: entity?.metadata?.annotations?.["aws.amazon.com/baws-repo-secret-arn"] || MISSING,
      resourceGroupArn: entity.metadata?.annotations?.["aws.amazon.com/baws-app-resource-group"] || MISSING,
      ecs: {
        serviceArn: entity.metadata?.annotations?.["aws.amazon.com/baws-ecs-service-arn"] || MISSING,
        taskDefArn: entity.metadata?.annotations?.["aws.amazon.com/baws-ecs-task-definition-arn"]?.split(':')
          .slice(0, -1).join(':') || MISSING,
      },
      environments: deployEnvs
    };

    // Uncomment these for debugging purposes
    // console.log('App Deployments:');
    // console.log(JSON.stringify(deployments, null, 2));

    return deployments;
  }

  // Execute the App deployment data retrieval
  const {
    value: deployments,
    error,
    loading,
    retry: refresh,
  } = useAsyncRetry(
    () => getData(),
    [catalogApi, entity],
  );

  return { deployments, loading, error, refresh };
};

// Utilize React context to hold app deployment data retrieval status
const AwsAppContext = createContext<AwsAppLoadingStatus>({ loading: true });

/**
 * Properties for the AsyncAwsAppProvider component.
 *
 * @public
 */
export interface AsyncAwsAppProviderProps {
  children: ReactNode;
  deployments?: AwsAppDeployments;
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
  const { children, deployments, loading, error, refresh } = props;
  const value = { deployments, loading, error, refresh };
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
  deployments?: AwsAppDeployments;
}

/**
 * Provides an app to be picked up by the `useAsyncAwsApp` hook.
 *
 * @public
 */
export const AwsAppProvider = (props: AwsAppProviderProps) => (
  <AsyncAwsAppProvider
    deployments={props.deployments}
    loading={!Boolean(props.deployments)}
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
export function useAsyncAwsApp(): AwsAppLoadingStatus {
  return React.useContext(AwsAppContext);
}

export const MISSING = 'missing';
