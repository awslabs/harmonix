import { CatalogClient } from '@backstage/catalog-client';
import { createBuiltinActions, createRouter } from '@backstage/plugin-scaffolder-backend';
import { Router } from 'express';
import type { PluginEnvironment } from '../types';
import { ScmIntegrations } from '@backstage/integration';
import {
  createBawsDeployBoilerplateAction,
  createRepoAccessTokenAction,
  createSecretAction,
  createS3BucketAction,
  getEnvProvidersAction,
  getComponentInfoAction,
  getSsmParametersAction,
} from '@aws/plugin-scaffolder-backend-aws-apps-for-backstage';

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  const catalogClient = new CatalogClient({
    discoveryApi: env.discovery,
  });

const integrations = ScmIntegrations.fromConfig(env.config);
const builtInActions = createBuiltinActions({
  integrations,
  catalogClient,
  reader: env.reader,
  config: env.config,
});

const actions = [
   ...builtInActions,
  createBawsDeployBoilerplateAction({ catalogClient }),
  createRepoAccessTokenAction({ integrations }),
  createS3BucketAction(),
  createSecretAction(),
  getEnvProvidersAction({ catalogClient }),
  getComponentInfoAction(),
  getSsmParametersAction(),
];

  return await createRouter({
    logger: env.logger,
    config: env.config,
    database: env.database,
    reader: env.reader,
    catalogClient,
    identity: env.identity,
    permissions: env.permissions,
    actions
  });
}
