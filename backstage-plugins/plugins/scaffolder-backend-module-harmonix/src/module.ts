import { coreServices, createBackendModule } from "@backstage/backend-plugin-api";
import { scaffolderActionsExtensionPoint  } from '@backstage/plugin-scaffolder-node/alpha';
import { createExampleAction } from "./actions/example";
import { ScmIntegrations } from '@backstage/integration';
import { CatalogClient } from '@backstage/catalog-client';
import { createAppendFileAction, createWriteFileAction } from '@roadiehq/scaffolder-backend-module-utils';

import { createRepoAccessTokenAction, createS3BucketAction, createSecretAction, getComponentInfoAction, getEnvProvidersAction, getPlatformMetadataAction, getPlatformParametersAction, getSsmParametersAction } from "./actions";



/** 
 * A backend module that registers the action into the scaffolder
 */
export const scaffolderModule = createBackendModule({
  moduleId: 'harmonix-action',
  pluginId: 'scaffolder',
  register({ registerInit }) {
    registerInit({
      deps: {
        scaffolderActions: scaffolderActionsExtensionPoint,
        config: coreServices.rootConfig,
        discovery: coreServices.discovery
      },
      async init({ scaffolderActions, config, discovery}) {
        const integrations = ScmIntegrations.fromConfig(config);
        const catalogClient = new CatalogClient({
          discoveryApi: discovery,
        });
        scaffolderActions.addActions(createWriteFileAction())
        scaffolderActions.addActions(createAppendFileAction())
        // scaffolderActions.addActions(createZipAction())
        // scaffolderActions.addActions(createSleepAction())
        // scaffolderActions.addActions(createMergeJSONAction())
        // scaffolderActions.addActions(createMergeAction())
        // scaffolderActions.addActions(createParseFileAction())
        // scaffolderActions.addActions(createSerializeYamlAction())
        // scaffolderActions.addActions(createSerializeJsonAction())
        // scaffolderActions.addActions(createJSONataAction())
        // scaffolderActions.addActions(createYamlJSONataTransformAction())
        // scaffolderActions.addActions(createJsonJSONataTransformAction())
        // scaffolderActions.addActions(createReplaceInFileAction())
        scaffolderActions.addActions(createS3BucketAction())
        scaffolderActions.addActions(createSecretAction({envConfig:config}))
        scaffolderActions.addActions(getEnvProvidersAction({ catalogClient }))
        scaffolderActions.addActions(getComponentInfoAction())
        scaffolderActions.addActions(getSsmParametersAction())
        scaffolderActions.addActions(getPlatformMetadataAction({envConfig:config}))
        scaffolderActions.addActions(getPlatformParametersAction({envConfig:config}))
        scaffolderActions.addActions( createRepoAccessTokenAction({integrations, envConfig:config}));
        scaffolderActions.addActions(createExampleAction());
      }
    });
  },
})
