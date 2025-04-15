// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import yaml from 'yaml';
import {
  getPlatformAccountSSMParameterValue
} from '../../helpers/action-context';
import { Config } from '@backstage/config'

const ID = 'harmonix:get-platform-parameters';

const examples = [
  {
    description: 'Retrieve AWS SSM parameter values for the Harmonix on AWS platform so that their values can be used by other template actions',
    example: yaml.stringify({
      steps: [
        {
          action: ID,
          id: 'harmonixGetPlatformParams',
          name: 'Get parameter values',
          input: {
            paramKeys:
              - '/my/ssm/parameter',
            region: 'us-east-1'
          },
        },
      ],
    }),
  },
];

export function getPlatformParametersAction(options: { envConfig: Config }) {
  const { envConfig } = options;

  return createTemplateAction({
    id: ID,
    description: 'Retrieve AWS SSM parameter values for platform configurations can be used by other template actions',
    supportsDryRun: true,
    examples,
    schema: {
      input: {
        paramKeys: d => d.array(d.string()).describe('The SSM parameter keys to look up'),

        // optional params
        region: d => d.string().optional().describe('Optional region to locate SSM parameters. If not provided, the default region will be used where Backstage is running'),
      },
      output: {
        params: d => d.object({}).passthrough(),
      }
    },
    handler: async ctx => {

      // If this is a dry run, return a hardcoded object
      if (ctx.isDryRun) {

        ctx.output('params', {
          '/opa/platform-role': 'arn:aws:sts::012345678912:role/platformrole',
          '/opa/pipeline-role': 'arn:aws:sts::012345678912:role/pipelinerole'
        });

        ctx.logger.info(`Dry run complete`);
        return;
      }

      let { paramKeys, region } = ctx.input;
      if (!region) {
        region = envConfig.getString('backend.platformRegion')
      }
      ctx.logger.info(`paramKeys: ${JSON.stringify(paramKeys)}`);
      ctx.logger.info(`Region: ${region}`);

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

      // Get a key/value map of SSM parameters
      const getEnvProviderSsmParams = async ()
        : Promise<{ [key: string]: string; }> => {
        const params = (await Promise.all(
          paramKeys.map(async (paramKey): Promise<{ [key: string]: string; }> => {
            const val = await getPlatformAccountSSMParameterValue(paramKey, region, ctx.logger);
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
      const envParams = await getEnvProviderSsmParams();
      ctx.logger.info(JSON.stringify(envParams));
      ctx.output('params', envParams);

    },
  });

}
