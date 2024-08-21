import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node/alpha';
import {AWSEnvironmentEntitiesProcessor} from './processor/AWSEnvironmentEntitiesProcessor'
import { AWSEnvironmentProviderEntitiesProcessor } from './processor/AWSEnvironmentProviderEntitiesProcessor'

export const catalogModuleAwsAppsEntitiesProcessor = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'aws-apps-entities-processor',
  register(reg) {
    reg.registerInit({
      deps: {  
        logger: coreServices.logger,
        catalog: catalogProcessingExtensionPoint,
       },
      async init({ catalog, logger }) {
        logger.info('Hello World from your AWS custom entities processor!');
        catalog.addProcessor(new AWSEnvironmentEntitiesProcessor());
        catalog.addProcessor(new AWSEnvironmentProviderEntitiesProcessor());
      },
    });
  },
});

export default catalogModuleAwsAppsEntitiesProcessor;

