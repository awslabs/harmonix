// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Config } from '@backstage/config';
import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import yaml from 'yaml';

const ID = 'opa:get-platform-metadata';

const examples = [
  {
    description: 'Retrieve data about the OPA on AWS platform',
    example: yaml.stringify({
      steps: [
        {
          action: ID,
          id: 'opaGetPlatformMetadata',
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
    description: 'Retrieve data about the OPA on AWS platform',
    examples,
    schema: {
      output: {
        type: 'object',
        required: [
          'platformRegion',
        ],
        properties: {
          platformRegion: {
            title: 'The AWS region where the OPA on AWS solution is deployed',
            type: 'string'
          }
        }
      }
    },
    async handler(ctx) {
      const platformRegion = envConfig.getString('backend.platformRegion');
      ctx.output('platformRegion', platformRegion);
    },
  });
}