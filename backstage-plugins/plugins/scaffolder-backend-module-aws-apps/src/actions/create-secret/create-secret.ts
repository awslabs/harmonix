// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { getAWScreds, AwsAppsApi, createAuditRecord } from '@aws/plugin-aws-apps-backend-for-backstage';

export function createSecretAction() {
  return createTemplateAction<{
    secretName: string;
    description?: string;
    accountId: string;
    region: string;
    tags?: {Key: string, Value: string | number | boolean}[];
  }>({
    id: 'baws:create-secret',
    description: 'Creates secret in Secret Manager',
    schema: {
      input: {
        type: 'object',
        required: ['secretName', 'accountId', 'region'],
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
          accountId: {
            title: 'AWS Account Id',
            description: 'The AWS account where the new secret should be created',
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
                  Value: { type: ['string','number','boolean']}
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
      const { secretName, description, accountId, region, tags } = ctx.input;
      const creds = await getAWScreds(accountId, region, ctx.user!.entity!);

      const apiClient = new AwsAppsApi(ctx.logger, creds.credentials, region, accountId);
      const secretDescription = description ?? 'Secret created from Backstage';
      try {
        const response = await apiClient.createSecret(secretName, secretDescription, tags);
        ctx.output('awsSecretArn', response.ARN!);

        const auditResponse = await createAuditRecord({
          actionType: 'Create Secret',
          actionName: response.Name!,
          apiClient: apiClient,
          roleArn: creds.roleArn,
          awsAccount: accountId,
          awsRegion: region,
          logger: ctx.logger,
          requester: ctx.user!.entity!.metadata.name,
          status: response.$metadata.httpStatusCode == 200 ? 'SUCCESS' : 'FAILED',
          owner: creds.owner || '',
        });
        if (auditResponse.status === 'FAILED') {
          throw Error;
        }
      } catch (e) {
        throw new Error(e instanceof Error ? e.message : JSON.stringify(e));
      }
    },
  });
}
