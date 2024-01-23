<!-- 
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 
-->
# OPA on AWS Backend

This is the backend part of the OPA on AWS plugin.  Its key responsibilities:

1. **Catalog contributions** - the plugin provides the AWSEnvironment and AWSEnvironmentProvider entity Kinds, including processing and validation of the entities.
2. **Authentication / Authorization** - the plugin assumes defined roles with permisisons for provisioning infrastructure resources for a target environment account.
3. **Audit** - the plugin provides services to record requested actions, user id and IAM role, timestamps, success/failure results, and additional information for the purpose of capturing audit-level information about the actions performed by the AWS Apps Backstage plugin against AWS.
4. **Proxying AWS requests** - the plugin provides API endpoints for specific AWS service actions.  It receives requests on these endpoints, validates the request, and proxies the request and response between Backstage and a specified AWS account and region.

## Installation

```sh
# From your Backstage root directory
yarn add --cwd packages/backend @aws/plugin-aws-apps-backend-for-backstage@0.2.0
```

## Configuration

Setup for the AWS Apps backend requires a router for Backstage, making the catalog aware of the new entity kinds.

### Configure a router

Create a `awsApps.ts` file in the `packages/backend/src/plugins/`directory.  This file creates a router for the OPA on AWS backend.

```ts
// packages/backend/src/plugins/awsApps.ts

import {createRouter} from '@aws/plugin-aws-apps-backend-for-backstage'
import { Router } from 'express';
import { PluginEnvironment } from '../types';
import {DefaultIdentityClient } from '@backstage/plugin-auth-node';

export default async function createPlugin({
  logger,
  discovery,
  config,
  permissions,
}: PluginEnvironment): Promise<Router> {
  return await createRouter({
    logger: logger,
    userIdentity: DefaultIdentityClient.create({
      discovery,
      issuer: await discovery.getExternalBaseUrl('auth'),
    }),
    config,
    permissions,
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
import { ScaffolderEntitiesProcessor } from '@backstage/plugin-catalog-backend-module-scaffolder-entity-model';
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

### Permission Framework Policy

The OPA on AWS backend plugin leverages the [Backstage permissions framework](https://backstage.io/docs/permissions/overview) to contribute a permission decision for access to audit entries.  If you would like to implement a policy for your Backstage instance to control access to audit entries you will start with the [Permission framework getting started documentation](https://backstage.io/docs/permissions/getting-started) to set up the base framework.  
With the framework in place, you can leverage the `readOpaAppAuditPermission` permission in your policy definition to restrict access to audit entries.

```ts
// Example of policy decision in a policy

import { readOpaAppAuditPermission } from '@aws/plugin-aws-apps-common-for-backstage';
...

export class permissionPolicy implements PermissionPolicy {
  async handle(
    request: PolicyQuery,
    user?: BackstageIdentityResponse
  ): Promise<PolicyDecision> {
    ...
    // restrict access to audit entries if the user is only a member of the Villians group
    const VILLIANS_GROUP = stringifyEntityRef({ kind: 'Group', namespace: DEFAULT_NAMESPACE, name: "villians" });
    const ownershipGroups = user?.identity.ownershipEntityRefs || [];
    if (
      isPermission(request.permission, readOpaAppAuditPermission) && 
      ownershipGroups.length === 1 && 
      ownershipGroups.includes(VILLIANS_GROUP)
    ) {
      return { result: AuthorizationResult.DENY };
    }

    ...
  }
}

```

Additional permission decisions and resources are planned for future releases.