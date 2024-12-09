import { coreServices, createBackendModule } from '@backstage/backend-plugin-api';
import { CatalogClient } from '@backstage/catalog-client';
import { scaffolderActionsExtensionPoint } from '@backstage/plugin-scaffolder-node/alpha';
import { ScmIntegrations } from '@backstage/integration';
import {
  createRepoAccessTokenAction,
  createSecretAction,
  createS3BucketAction,
  getEnvProvidersAction,
  getComponentInfoAction,
  getSsmParametersAction,
  getPlatformParametersAction,
  getPlatformMetadataAction,
} from './actions';

/** @public */
export const scaffolderModuleAwsApps = createBackendModule({
  pluginId: 'scaffolder', // name of the plugin that the module is targeting
  moduleId: 'aws-apps',
  register(env) {
    env.registerInit({
      deps: {
        scaffolder: scaffolderActionsExtensionPoint,
        config: coreServices.rootConfig,
        logger: coreServices.logger,
        discovery: coreServices.discovery,
      },
      async init({ scaffolder, config, logger, discovery }) {
        const integrations = ScmIntegrations.fromConfig(config);
        const catalogClient = new CatalogClient({
          discoveryApi: discovery,
        });
        scaffolder.addActions(createS3BucketAction());
        scaffolder.addActions(createSecretAction({ envConfig: config }));
        scaffolder.addActions(getEnvProvidersAction({ config, logger, catalogClient }));
        scaffolder.addActions(getComponentInfoAction());
        scaffolder.addActions(getSsmParametersAction(config, logger));
        scaffolder.addActions(getPlatformMetadataAction({ envConfig: config }));
        scaffolder.addActions(getPlatformParametersAction({ envConfig: config }));
        scaffolder.addActions(createRepoAccessTokenAction({ integrations, envConfig: config }));
      },
    });
  },
});
