// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { ScmIntegrationRegistry } from '@backstage/integration';
import { parseRepoUrl } from '../../helpers/util';
import { InputError } from '@backstage/errors';
import { getAWScreds, AwsAppsApi, createAuditRecord } from '@aws/plugin-aws-apps-backend';
import { validate as validateArn } from '@aws-sdk/util-arn-parser';

export function createRepoAccessTokenAction(options: { integrations: ScmIntegrationRegistry }) {
  const { integrations } = options;
  return createTemplateAction<{
    repoUrl: string;
    secretArn: string;
    projectId: number;
    accountId: string;
    region: string;
  }>({
    id: 'baws:createRepoAccessToken:gitlab',
    description: 'Initializes a git repository of the content in the workspace, and publishes it to GitLab.',
    schema: {
      input: {
        type: 'object',
        required: ['repoUrl', 'secretArn', 'projectId'],
        properties: {
          repoUrl: {
            title: 'Repository Location',
            type: 'string',
          },
          projectId: {
            title: 'Project Id',
            type: 'number',
          },
          secretArn: {
            title: 'Arn of the SecretsManager secret where the access token will be stored',
            type: 'string',
          },
          accountId: {
            title: 'AWS Account Id',
            type: 'string',
          },
          region: {
            title: 'AWS Region',
            type: 'string',
          },
        },
      },
      output: {
        type: 'object',
        properties: {
          repoToken: {
            title: 'Repo Access Token',
            type: 'string',
          },
        },
      },
    },
    async handler(ctx) {
      const { repoUrl, projectId, secretArn, accountId, region } = ctx.input;
      const { repo, host } = parseRepoUrl(repoUrl, integrations);
      ctx.logger.info(`Project Id: ${projectId}`);
      const integrationConfig = integrations.gitlab.byHost(host);
      const creds = await getAWScreds(accountId, region, ctx.user!.entity!);
      if (!integrationConfig) {
        throw new InputError(
          `No matching integration configuration for host ${host}, please check your integrations config`,
        );
      }
      if (!integrationConfig.config.token) {
        throw new InputError(`No token available for host ${host}`);
      }
      const token = integrationConfig.config.token!;

      // get the apiBaseUrl
      let apiBaseUrl = integrationConfig.config.apiBaseUrl ?? `https://${host}/api/v4`;

      if (!validateArn(secretArn)) {
        throw new Error(`Invalid ARN provided for Secret: ${secretArn}`);
      }

      ctx.logger.info(`Creating token for repo: ${repo}`);

      const res = await fetch(`${apiBaseUrl}/projects/${projectId.toString()}/access_tokens`, {
        method: 'POST',
        body: JSON.stringify({
          name: `${repo}-repo-access-token`,
          scopes: ['api', 'read_repository', 'write_repository', 'read_api'],
          access_level: 40, // 10=Guest, 20=Reporter, 30=Developer, 40=Maintainer, 50=Owner
        }),
        headers: {
          'PRIVATE-TOKEN': token,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      const repoToken = data.token;

      ctx.output('repoToken', repoToken);

      const apiClient = new AwsAppsApi(ctx.logger, creds.credentials, region, accountId);

      try {
        const response = await apiClient.putSecretValue(secretArn, repoToken);
        const auditResponse = await createAuditRecord({
          actionType: 'Update Secret',
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
