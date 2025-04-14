// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { createSecret } from '../../helpers/action-context';
import { Config } from '@backstage/config'
import yaml from 'yaml';


const ID = 'opa:create-secret';

const examples = [
  {
    description: 'Create a new AWS Secrets Manager Secret',
    example: yaml.stringify({
      steps: [
        {
          action: ID,
          id: 'createSecretManager',
          name: 'Create a Secret',
          input: {
            secretName: 'mySecretName',
          },
        },
      ],
    }),
  },
];

export function createSecretAction(options: { envConfig: Config }) {
  const { envConfig } = options;

  return createTemplateAction({
    id: ID,
    description: 'Creates secret in Secrets Manager',
    supportsDryRun: true,
    examples,
    schema: {
      input: {
        secretName: d => d.string().describe('The name of the secret to create in SecretsManager'),

        // optional params
        description: d => d.string().optional().describe('An optional description of the secret'),
        region: d => d.string().optional().describe('The AWS region where the new secret should be created'),
        tags: d => d.array(
          d.object({
            Key: d.string().describe('The tag name'),
            Value: d.string().or(d.number()).or(d.boolean()).describe('The tag value'),
          })
        ).optional(),
      },
      output: {
        awsSecretArn: d => d.string().describe('The ARN of the created secret'),
      }
    },
    handler: async ctx => {

      // If this is a dry run, return a hardcoded object
      if (ctx.isDryRun) {

        ctx.output('awsSecretArn', 'arn:aws:secretsmanager:us-east-1:123456789123:secret:my-secret');
        ctx.logger.info(`Dry run complete`);
        return;
      }

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
