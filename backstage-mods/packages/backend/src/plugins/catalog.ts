import { CatalogBuilder } from '@backstage/plugin-catalog-backend';
import { ScaffolderEntitiesProcessor } from '@backstage/plugin-scaffolder-backend';
import { Router } from 'express';
import { PluginEnvironment } from '../types';
import { OktaOrgEntityProvider } from '@roadiehq/catalog-backend-module-okta';
import { GitlabFillerProcessor } from '@immobiliarelabs/backstage-plugin-gitlab-backend';
import { AWSEnvironmentEntitiesProcessor, AWSEnvironmentProviderEntitiesProcessor} from '@aws/plugin-aws-apps-backend-for-backstage';

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  const builder = await CatalogBuilder.create(env);
  const orgProvider = OktaOrgEntityProvider.fromConfig(env.config, {
    logger: env.logger,
    userNamingStrategy: 'strip-domain-email',
    groupNamingStrategy: 'kebab-case-name',
  });
    
  builder.addEntityProvider(orgProvider);

// Custom processors
builder.addProcessor(new GitlabFillerProcessor(env.config));
builder.addProcessor(new AWSEnvironmentEntitiesProcessor());
builder.addProcessor(new AWSEnvironmentProviderEntitiesProcessor())

  builder.addProcessor(new ScaffolderEntitiesProcessor());
  const { processingEngine, router } = await builder.build();
  orgProvider.run();
  await processingEngine.start();
  return router;
}
