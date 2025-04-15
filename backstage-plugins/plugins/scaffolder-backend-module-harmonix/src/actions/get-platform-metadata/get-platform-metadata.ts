// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Config } from '@backstage/config';
import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import yaml from 'yaml';

const ID = 'harmonix:get-platform-metadata';

const examples = [
  {
    description: 'Retrieve data about the Harmonix on AWS platform',
    example: yaml.stringify({
      steps: [
        {
          action: ID,
          id: 'harmonixGetPlatformMetadata',
          name: 'Get platform information',
        },
      ],
    }),
  },
];

export function getPlatformMetadataAction(options: { envConfig: Config }) {
  const { envConfig } = options;

  return createTemplateAction({
    id: ID,
    description: 'Retrieve data about the Harmonix on AWS platform',
    supportsDryRun: true,
    examples,
    schema: {
      output: {
        platformRegion: d => d.string().describe('The AWS region where the Harmonix on AWS solution is deployed'),
      }
    },
    handler: async ctx => {

      // If this is a dry run, return a hardcoded object
      if (ctx.isDryRun) {

        ctx.output('platformRegion', 'us-east-1');
        ctx.logger.info(`Dry run complete`);
        return;
      }

      const platformRegion = envConfig.getString('backend.platformRegion');
      ctx.output('platformRegion', platformRegion);
    },
  });

}