// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ScmIntegrationRegistry } from '@backstage/integration';
import { parseRepoUrl } from '../../helpers/util';
import { InputError } from '@backstage/errors';
import { validate as validateArn } from '@aws-sdk/util-arn-parser';
import { putSecret } from '../../helpers/action-context';
import { Config } from '@backstage/config'
import yaml from 'yaml';
import { createTemplateAction } from '@backstage/plugin-scaffolder-node';

const ID = 'harmonix:createRepoAccessToken:gitlab';

const examples = [
  {
    description: 'Create a new Gitlab repository access token for the newly created repo and store the access token in AWS SecretsManager',
    example: yaml.stringify({
      steps: [
        {
          action: ID,
          id: 'createRepoToken',
          name: 'Create Repo Token',
          input: {
            repoUrl: "${{ parameters.repoUrl }}",
            projectId: "${{ steps['publish'].output.projectId }}",
            secretArn: "${{ steps['createSecretManager'].output.awsSecretArn }}",
            region: "us-east-1"
          },
        },
      ],
    }),
  },
];

export function createRepoAccessTokenAction(options: { integrations: ScmIntegrationRegistry, envConfig: Config }) {
  const { integrations, envConfig } = options;

  return createTemplateAction({
    id: ID,
    description: 'Initializes a git repository of the content in the workspace, and publishes it to GitLab.',
    supportsDryRun: true,
    examples,
    schema: {
      input: {
        repoUrl: d => d.string().describe('Repository Location'),
        projectId: d => d.number().describe('Project Id'),
        secretArn: d => d.string().describe('ARN of the SecretsManager secret where the access token will be stored'),
        region: d => d.string().optional().describe('AWS Region'),
      },
    },
    handler: async ctx => {

      // If this is a dry run, log and return
      if (ctx.isDryRun) {
        ctx.logger.info(`Dry run complete`);
        return;
      }

      let { repoUrl, projectId, secretArn, region } = ctx.input;
      if (!region) {
        region = envConfig.getString('backend.platformRegion')
      }
      const { repo, host } = parseRepoUrl(repoUrl, integrations);
      ctx.logger.info(`Project Id: ${projectId}`);
      const integrationConfig = integrations.gitlab.byHost(host);

      const repoToken = await createRepoToken();
      await putSecret(secretArn, repoToken, region, ctx.logger);


      /**
       * helper function to create a repo token for Gitlab
       * @returns token for the repo
       */
      async function createRepoToken(): Promise<string> {
        if (!integrationConfig) {
          throw new InputError(
            `No matching integration configuration for host ${host}, please check your integrations config`
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
            expires_at: getExpiryDate(), // required field in Gitlab 16.2+
          }),
          headers: {
            'PRIVATE-TOKEN': token,
            'Content-Type': 'application/json',
          },
        });

        // throw an error if we do not have a 2xx level response
        if (res.ok) {
          // We have a successful response, so return the token from the response data
          const data = await res.json();
          return data.token as string;
        } else {
          const message = `Failed to create repo access token: ${res.status}: ${res.statusText}`
          ctx.logger.info(message);
          throw new Error(message);
        }

      }

      /**
       * Helper function to return a date 364 days from now
       * so that it is (almost) the maximum date for a Gitlab personal access token.
       * The maximum time is 365 days, but we're being conservative to account for
       * locales, timezones, and leap years which may interfere with exact calculations.
       * 
       * Returned string will be in YYYY-MM-DD format
       */
      function getExpiryDate(): string {
        const date = new Date();
        date.setDate(date.getDate() + 364);
        return date.toISOString().split('T')[0];
      }
    },
  });

}
