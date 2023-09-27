// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { createSecret } from '../../helpers/action-context';
import { Config } from '@backstage/config'

export function createSecretAction(options: { envConfig: Config }) {
  const { envConfig } = options;
  return createTemplateAction<{
    secretName: string;
    description?: string;
    region?: string;
    tags?: { Key: string, Value: string | number | boolean }[];
  }>({
    id: 'opa:create-secret',
    description: 'Creates secret in Secret Manager',
    schema: {
      input: {
        type: 'object',
        required: ['secretName'],
        properties: {
          secretName: {
            title: 'Secret Name',
            description: 'The name of the secret to create in SecretsManager',
            type: 'string',
          },
          description: {
            title: 'Description',
            description: 'An optional description of the secret',
            type: 'string',
          },
          region: {
            title: 'AWS Region',
            description: 'The AWS region where the new secret should be created',
            type: 'string',
          },
          tags: {
            title: 'AWS Tags',
            description: 'key/value pairs to apply as tags to any created AWS resources',
            type: 'array',
            minProperties: 1,
            items: [
              {
                type: 'object',
                properties: {
                  Key: { type: 'string' },
                  Value: { type: ['string', 'number', 'boolean'] }
                }
              },
            ],
          },
        },
      },
      output: {
        type: 'object',
        properties: {
          secretARN: {
            title: 'SecretARN',
            type: 'string',
          },
        },
      },
    },
    async handler(ctx) {
      let { secretName, description, region, tags } = ctx.input;
      if (!region) {
        region = envConfig.getString('backend.platformRegion')
      }
      const secretDescription = description ?? 'Secret created from Backstage scaffolder action';

      try {
        const ARN = await createSecret(secretName, secretDescription, region, tags, ctx.logger);
        ctx.output('awsSecretArn', ARN!);

      } catch (e) {
        throw new Error(e instanceof Error ? e.message : JSON.stringify(e));
      };
    },

  });
}
