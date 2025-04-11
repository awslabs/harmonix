// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import yaml from 'yaml';
import {
  EnvProviderConnectMap,
  getEnvironmentProviderConnectInfo,
  getSSMParameterValue,
} from '../../helpers/action-context';
import { EnvironmentProvider, EnvironmentProviderConnection } from '../../types';

const ID = 'opa:get-ssm-parameters';

const examples = [
  {
    description: 'Retreive AWS SSM parameter values for each environment provider so that their configurations can be used by other template actions',
    example: yaml.stringify({
      steps: [
        {
          action: ID,
          id: 'opaGetSsmParams',
          name: 'Get parameter values',
          input: {
            envProviders: "${{ steps['opaGetAwsEnvProviders'].output.envProviders }}",
            paramKeys:
              - '/my/ssm/parameter'
          },
        },
      ],
    }),
  },
];

export function getSsmParametersAction() {

  return createTemplateAction<{
    paramKeys: string[];
    envProviders: EnvironmentProvider[];
  }>({
    id: ID,
    description: 'Retreive AWS SSM parameter values for each environment provider so that their configurations can be used by other template actions',
    examples,
    schema: {
      input: {
        type: 'object',
        required: ['paramKeys'],
        properties: {
          paramKeys: {
            type: 'array',
            items: {
              type: 'string'
            },
            title: 'SSM parameter keys',
            description: 'The SSM parameter keys to look up',
          },
          envProviders: {
            title: 'AWS Environment Providers',
            description: 'The AWS environment providers containing account and region info',
            type: 'array',
          },
        },
      },
      output: {
        type: 'object',
        required: [
          'params',
        ],
        properties: {
          params: {
            title: 'Map of SSM parameters, keyed off of the environment provider name',
            type: 'object',
          },
        },
      },
    },
    async handler(ctx) {
      const { paramKeys, envProviders } = ctx.input;

      ctx.logger.info(`paramKeys: ${JSON.stringify(paramKeys)}`);

      // Fail early if there is no user entity
      if (ctx.user?.entity === undefined) {
        // Verify the automationKey value.  If it matches, set an automation user in the context
        if (ctx.secrets?.automationKey === process.env.AUTOMATION_KEY) {
          console.log("Automation key provided to use automation user");
          ctx.user = {
            entity: {
              apiVersion: 'backstage.io/v1alpha1',
              kind: 'User',
              metadata: { name: 'automation' },
              spec: { profile: { displayName: "Automation User" } }
            }
          }
        } else {
          ctx.logger.info(`No user context provided for ${ID} action`);
          throw new Error(`No user context provided for ${ID} action`);
        }
      }

      const providerConnect: EnvProviderConnectMap =
        await getEnvironmentProviderConnectInfo(envProviders, ctx.user!.entity!);

      // Get a key/value map of SSM parameters for the supplied environment provider connection
      const getEnvProviderSsmParams = async (connection: EnvironmentProviderConnection)
        : Promise<{ [key: string]: string; }> => {

        const params = (await Promise.all(
          paramKeys.map(async (paramKey): Promise<{ [key: string]: string; }> => {
            const val = await getSSMParameterValue(
              connection.region, connection.awsAuthResponse.credentials, paramKey, ctx.logger);
            return {
              [paramKey]: val
            };
          })
        )).reduce((acc, paramKeyValMap) => {
          const typedAcc: { [key: string]: string; } = acc;
          const key = Object.keys(paramKeyValMap)[0];
          return {
            ...typedAcc, [key]: paramKeyValMap[key]
          };
        }, {});

        return params;

      };

      const paramsPerEnvProvider = (await Promise.all(
        envProviders.map(async (envProvider: EnvironmentProvider)
          : Promise<{ [key: string]: { [key: string]: string; }; }> => {

          const { envProviderName } = envProvider;
          const envProviderConnection = providerConnect[envProviderName];
          const envParams = await getEnvProviderSsmParams(envProviderConnection);
          return {
            [envProviderName]: envParams
          }
        })
      )).reduce((acc, envProviderNameToSsmParamsMap) => {
        const typedAcc: { [key: string]: { [key: string]: string; }; } = acc;
        const key = Object.keys(envProviderNameToSsmParamsMap)[0];
        return {
          ...typedAcc, [key]: envProviderNameToSsmParamsMap[key]
        };
      }, {});

      const maskedValues = JSON.parse(JSON.stringify(paramsPerEnvProvider)); // deep clone
      Object.keys(maskedValues).forEach(providerName => {
        const envProviderParamsMap = maskedValues[providerName];
        Object.keys(envProviderParamsMap).forEach(ssmKey => {
          if (envProviderParamsMap[ssmKey]) {
            envProviderParamsMap[ssmKey] = "masked";
          } else {
            envProviderParamsMap[ssmKey] = "blank or missing value";
          }
        })
      })

      ctx.logger.info(`masked params: ${JSON.stringify(maskedValues, null, 2)}`);

      ctx.output('params', paramsPerEnvProvider);
    },
  });

}
