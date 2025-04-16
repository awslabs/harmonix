import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { createRouter } from './router';

import { createAwsSDKService } from './services/AWSSDKService';
import { createGitProviderService } from './services/GitProviderService';
import { createAppsPlatformService } from './services/PlatformService';
import { catalogServiceRef} from '@backstage/plugin-catalog-node'
import { readOpaAppAuditPermission } from '@aws/plugin-aws-apps-common-for-backstage';

/**
 * harmonixPlugin backend plugin
 *
 * @public
 */
export const harmonixPlugin = createBackendPlugin({
  pluginId: 'harmonix-backend',
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        userInfo: coreServices.userInfo,
        config: coreServices.rootConfig,
        auth: coreServices.auth,
        httpAuth: coreServices.httpAuth,
        httpRouter: coreServices.httpRouter,
        catalogApi: catalogServiceRef,
        permissionsRegistry: coreServices.permissionsRegistry,
        permissions: coreServices.permissions,
      },
      async init({ logger, userInfo, config, auth, httpAuth, httpRouter, catalogApi, permissionsRegistry, permissions }) {
        const awsSDKService = await createAwsSDKService({logger});
        const gitProviderService = await createGitProviderService({logger});
        const platformService = await createAppsPlatformService({logger});
        platformService.setPlatformRegion(config.getString('backend.platformRegion'));
        platformService.setGitProviderService(gitProviderService);

        permissionsRegistry.addPermissions([readOpaAppAuditPermission]);

        httpRouter.use(
          await createRouter({
            logger,
            userInfo,
            catalogApi,
            permissions,
            auth,
            httpAuth,
            awsSDKService,
            gitProviderService,
            platformService
          }),
        );
      },
    });
  },
});
