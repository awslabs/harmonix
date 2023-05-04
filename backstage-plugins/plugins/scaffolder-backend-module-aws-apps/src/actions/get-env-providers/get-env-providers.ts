// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CatalogApi } from '@backstage/catalog-client';
import { JsonArray, } from '@backstage/types';
import { Entity, EntityRelation, RELATION_DEPENDENCY_OF } from '@backstage/catalog-model';
import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import yaml from 'yaml';
import { getAWScreds } from '@aws/plugin-aws-apps-backend-for-backstage';
import { getSSMParameterValue } from '../../helpers/action-context';
import { EnvironmentProvider } from '../../types';

const ID = 'baws:get-env-providers';

const examples = [
  {
    description: 'Retreive AWS environment providers so that their configurations can be used by other template actions',
    example: yaml.stringify({
      steps: [
        {
          action: ID,
          id: 'bawsGetAwsEnvProviders',
          name: 'Get AWS Environment Providers',
          input: {
            environmentRef: 'awsenvironment:Test-Environment',
          },
        },
      ],
    }),
  },
];

interface DeploymentParameters {
  envName: string;
  envProviderName: string;
  envProviderType: string;
  accountId: string;
  region: string;
  ssmPathVpc: string;
  ssmPublicSubnets: string;
  ssmPrivateSubnets: string;
  ssmPathEcsCluster: string;
}

export function getEnvProvidersAction(options: { catalogClient: CatalogApi }) {
  const { catalogClient } = options;

  return createTemplateAction<{
    environmentRef: string;
  }>({
    id: ID,
    description: 'Retrieves AWS Environment Provider data',
    examples,
    schema: {
      input: {
        required: ['environmentRef'],
        type: 'object',
        properties: {
          environmentRef: {
            type: 'string',
            title: 'Entity reference',
            description: 'The entity reference identifier for an AWS Environment',
          },
        },
      },
      output: {
        type: 'object',
        required: [
          'envName',
          'envShortName',
          'envProviders',
        ],
        properties: {
          envName: {
            title: 'The AWS environment name',
            type: 'string',
          },
          envShortName: {
            title: 'The short AWS environment name e.g. dev, qa, prod',
            type: 'string',
          },
          envProviders: {
            title: 'The AWS environment providers',
            type: 'array',
            items: {
              type: 'object',
              required: [
                'envProviderName',
                'envProviderType',
                'account',
                'region',
                'vpcId',
                'publicSubnets',
                'privateSubnets',
                'assumedRoleArn'
              ],
              properties: {
                envProviderName: {
                  title: 'The AWS environment provider name',
                  type: 'string',
                },
                envProviderType: {
                  title: 'The AWS environment provider type',
                  type: 'string',
                },
                account: {
                  title: 'The AWS account where infrastructure will be deployed',
                  type: 'string',
                },
                region: {
                  title: 'The AWS region where infrastructure will be deployed',
                  type: 'string',
                },
                vpcId: {
                  title: 'The VPC identifier where infrastructure will be deployed',
                  type: 'string',
                },
                publicSubnets: {
                  title: 'The VPC public subnet ids',
                  type: 'array',
                },
                privateSubnets: {
                  title: 'The VPC private subnet ids',
                  type: 'array',
                },
                ecsClusterArn: {
                  title: 'The Arn of the ECS cluster where the service and task are deployed, if needed',
                  type: 'string',
                },
                assumedRoleArn: {
                  title: 'The Arn of AWS IAM role that can be assumed to deploy resources to the environment provider',
                  type: 'string',
                },
              }
            }
          },
        }
      },
    },
    async handler(ctx) {
      const { environmentRef } = ctx.input;
      const token = ctx.secrets?.backstageToken;

      ctx.logger.info(`environmentRef: ${environmentRef}`);

      // Fail early if there is no user entity
      if (ctx.user?.entity === undefined) {
        ctx.logger.info(`No user context provided for ${ID} action`);
        return;
      }

      const awsEnvEntity = await catalogClient.getEntityByRef(environmentRef, { token });
      if (awsEnvEntity === undefined) {
        throw new Error(`The environment entity "${environmentRef}" could not be located in the catalog.`);
      }

      const deploymentParametersArray = await getEnvDeploymentParameters(awsEnvEntity);
      
      ctx.logger.debug(`envProviders info: ${JSON.stringify(deploymentParametersArray, null, 2)}`);

      const envProviderOutputArray: JsonArray = [];

      for (const params of deploymentParametersArray) {
        const { accountId, region, ssmPathVpc, ssmPublicSubnets, ssmPrivateSubnets, ssmPathEcsCluster, 
          envProviderName, envProviderType } = params;

        // Get AWS credentials
        ctx.logger.info(`Getting credentials for AWS deployment to account ${accountId} in ${region}`);
        const { credentials, roleArn } = await getAWScreds(accountId, region, ctx.user!.entity!);

        const envProvider: EnvironmentProvider = {
          envProviderName,
          envProviderType,
          accountId,
          region,
          vpcId: await getSSMParameterValue(region, credentials, ssmPathVpc, ctx.logger),
          publicSubnets:  JSON.parse(await getSSMParameterValue(region, credentials, ssmPublicSubnets, ctx.logger)),
          privateSubnets:  JSON.parse(await getSSMParameterValue(region, credentials, ssmPrivateSubnets, ctx.logger)),
          ecsClusterArn: envProviderType === 'ecs-fargate' ? await getSSMParameterValue(region, credentials, ssmPathEcsCluster, ctx.logger) : '',
          assumedRoleArn: roleArn,
        };

        envProviderOutputArray.push(envProvider);
      }

      ctx.logger.info(`Resolved environment providers: ${JSON.stringify(envProviderOutputArray, null, 2)}`);

      ctx.output('envName', awsEnvEntity.metadata.name);
      ctx.output('envShortName', awsEnvEntity.metadata['short-name']?.toString() || '');
      ctx.output('envProviders', envProviderOutputArray);

      // For a given AWS Environment entity, get the defined attributes required for a deployment to AWS
      async function getEnvDeploymentParameters(envEntity: Entity): Promise<DeploymentParameters[]> {
        const entityRelations: EntityRelation[] = envEntity?.relations ?? [];
        const envProvRefs: string[] = entityRelations
          .filter(
            envProvRel =>
              envProvRel.type === RELATION_DEPENDENCY_OF && envProvRel.targetRef.startsWith('awsenvironmentprovider'),
          )
          .map(envProvRel => envProvRel.targetRef);

        const envProviderEntities = await catalogClient.getEntitiesByRefs({ entityRefs: envProvRefs }, { token });

        const deploymentParams: DeploymentParameters[] = envProviderEntities.items
          .filter(
            entity =>
              entity &&
              ['name', 'env-type', 'aws-account', 'aws-region', 'vpc', 'cluster-name'].every(key => key in entity.metadata),
          )
          .map(entity => {
            const { metadata } = entity!;
            const deployParams: DeploymentParameters = {
              envName: envEntity.metadata.name,
              envProviderName: metadata.name,
              envProviderType: metadata['env-type']?.toString() || '',
              accountId: metadata['aws-account']?.toString() || '',
              region: metadata['aws-region']?.toString() || '',
              ssmPathVpc: metadata.vpc?.toString() || '',
              ssmPrivateSubnets: `${metadata.vpc?.toString() || ''}/private-subnets`,
              ssmPublicSubnets: `${metadata.vpc?.toString() || ''}/public-subnets`,
              ssmPathEcsCluster: metadata['cluster-name']?.toString() || '',
            };
            return deployParams;
          });

        return deploymentParams;
      }
    },
  });

}
