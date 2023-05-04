<!-- 
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 
-->
# AWS Apps Backend

This is the backend part of the AWS Apps plugin.  It has four primary responsibilities:

1. **Catalog contributions** - the plugin provides the AWSEnvironment and AWSEnvironmentProvider entity Kinds, including processing and validation of the entities.
2. **Authentication and Role Mapping** - the plugin provides API services to map a user's idP group membership (e.g. Okta group) to an AWS IAM role.  
3. **Audit** - the plugin provides services to record requested actions, user id and IAM role, timestamps, success/failure results, and additional information for the purpose of capturing audit-level information about the actions performed by the AWS Apps Backstage plugin against AWS.
4. **Proxying AWS requests** - the plugin provides API endpoints for specific AWS service actions.  It receives requests on these endpoints, validates the request, and proxies the request and response between Backstage and a specified AWS account and region.

## Installation

```sh
# From your Backstage root directory
yarn add --cwd packages/backend @aws/plugin-aws-apps-backend-for-backstage@0.1.0
```

## Configuration

Setup for the AWS Apps backend requires a router for Backstage, making the catalog aware of the new entity kinds.

### Configure a router

Create a `awsApps.ts` file in the `packages/backend/src/plugins/`directory.  This file creates a router for the AWS Apps backend.

```ts
// packages/backend/src/plugins/awsApps.ts

import { createRouter } from '@aws/plugin-aws-apps-backend-for-backstage'
import { Router } from 'express';
import { PluginEnvironment } from '../types';
export default async function createPlugin(env: PluginEnvironment): Promise<Router> {
  return await createRouter({
    logger: env.logger,
    userIdentity: env.identity,
  });
}
```

You can now add the router to Backstage in the `packages/backend/src/plugins/index.ts` file

```diff
...
+ import awsApps from './plugins/awsApps'

...
// add the environment and router
  const catalogEnv = useHotMemoize(module, () => createEnv('catalog'));
  const scaffolderEnv = useHotMemoize(module, () => createEnv('scaffolder'));
  const authEnv = useHotMemoize(module, () => createEnv('auth'));
  const proxyEnv = useHotMemoize(module, () => createEnv('proxy'));
  const techdocsEnv = useHotMemoize(module, () => createEnv('techdocs'));
  const searchEnv = useHotMemoize(module, () => createEnv('search'));
  const appEnv = useHotMemoize(module, () => createEnv('app'));
+  const awsAppsEnv = useHotMemoize(module, () => createEnv('aws-apps-backend'));

  const apiRouter = Router();
  apiRouter.use('/catalog', await catalog(catalogEnv));
  apiRouter.use('/scaffolder', await scaffolder(scaffolderEnv));
  apiRouter.use('/auth', await auth(authEnv));
  apiRouter.use('/techdocs', await techdocs(techdocsEnv));
  apiRouter.use('/proxy', await proxy(proxyEnv));
  apiRouter.use('/search', await search(searchEnv));
+ apiRouter.use('/aws-apps-backend', await awsApps(awsAppsEnv));

...
```

### Configure the catalog

Add to the Backstage catalog so that it's aware of the processors for the AWSEnvironment and AWSEnvironmentProvider entity kinds.

```diff
// packages/backend/src/plugins/catalog.ts

import { CatalogBuilder } from '@backstage/plugin-catalog-backend';
import { ScaffolderEntitiesProcessor } from '@backstage/plugin-scaffolder-backend';
import { Router } from 'express';
import { PluginEnvironment } from '../types';
+ import { AWSEnvironmentEntitiesProcessor, AWSEnvironmentProviderEntitiesProcessor} from '@aws/plugin-aws-apps-backend-for-backstage';

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  const builder = await CatalogBuilder.create(env);
  
  builder.addProcessor(new ScaffolderEntitiesProcessor());

+ // Custom processors
+ builder.addProcessor(new AWSEnvironmentEntitiesProcessor());
+ builder.addProcessor(new AWSEnvironmentProviderEntitiesProcessor());

  const { processingEngine, router } = await builder.build();

  await processingEngine.start();

  return router;
```

## Links

- [AWS Apps plugin overview](../../../README.md)
- [Frontend part of aws-apps](../aws-apps/README.md)