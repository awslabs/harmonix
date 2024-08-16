import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { createRouter } from './service/router';
import { catalogServiceRef } from '@backstage/plugin-catalog-node/alpha';
/**
 * awsAppsPlugin backend plugin
 *
 * @public
 */
export const awsAppsPlugin = createBackendPlugin({
  pluginId: 'aws-apps-backend',
  register(env) {
    env.registerInit({
      deps: {
        config: coreServices.rootConfig,
        logger: coreServices.logger,
        httpRouter: coreServices.httpRouter,
        userInfo: coreServices.userInfo,
        catalogApi: catalogServiceRef,
        permissions: coreServices.permissions,
        auth: coreServices.auth,
        httpAuth: coreServices.httpAuth,
      },
      async init({
        config,
        logger,
        httpRouter,
        userInfo,
        catalogApi,
        permissions,
        auth,
        httpAuth,
      }) {
        httpRouter.use(
          await createRouter({
            config,
            logger,
            userInfo,
            catalogApi,
            permissions,
            auth,
            httpAuth,
          }),
        );
        httpRouter.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated',
        });
      },
    });
  },
});
