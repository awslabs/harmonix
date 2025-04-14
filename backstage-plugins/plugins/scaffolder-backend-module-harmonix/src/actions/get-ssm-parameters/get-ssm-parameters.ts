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

  return createTemplateAction({
    id: ID,
    description: 'Retreive AWS SSM parameter values for each environment provider so that their configurations can be used by other template actions',
    supportsDryRun: true,
    examples,
    schema: {
      input: {
        paramKeys: d => d.array(d.string()).describe('The SSM parameter keys to look up'),
        envProviders: d => d.array(
          d.object({
            envProviderName: d.string().describe('The AWS environment provider name'),
            envProviderType: d.string().describe('The AWS environment provider type'),
            envProviderPrefix: d.string().describe('The AWS environment provider prefix'),
            accountId: d.string().describe('The AWS account where infrastructure will be deployed'),
            region: d.string().describe('The AWS region where infrastructure will be deployed'),
            vpcId: d.string().describe('The VPC identifier where infrastructure will be deployed'),
            publicSubnets: d.string().describe('The VPC public subnet ids'),
            privateSubnets: d.string().describe('The VPC private subnet ids'),
            assumedRoleArn: d.string().describe('The ARN of AWS IAM role that can be assumed to deploy resources to the environment provider'),

            // optional output attributes that are only returned for providers that have compute clusters
            clusterArn: d.string().optional().describe('The ARN of the cluster where the service and task are deployed, if needed. A cluster could be ECS or EKS'),
            kubectlLambdaArn: d.string().optional().describe('EKS Only - The ARN of the lambda function that that can execute kubectl commands against the provider\'s EKS cluster'),
            kubectlLambdaRoleArn: d.string().optional().describe('The ARN of the IAM role for the lambda function that that can execute kubectl commands against the provider\'s EKS cluster'),
          })
        ).describe('The AWS environment providers'),
      },
      output: {
        params: d => d.object({}).passthrough(),
      }
    },
    handler: async ctx => {

      // If this is a dry run, return a hardcoded object
      if (ctx.isDryRun) {

        ctx.output('params', {
          'myProviderName': {
            '/my/ssm/parameter': 'some value',
          }
        });

        ctx.logger.info(`Dry run complete`);
        return;
      }

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
