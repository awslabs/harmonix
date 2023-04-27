# App Development for Backstage<!-- -->.io on AWS

**App Development for Backstage<!-- -->.io on AWS** provides a new developer experience to simplify the use and consumption of AWS services while minimizing required expertise in cloud infrastructure technologies.
Built on the [Backstage open platform](https://backstage.io), this solution makes the AWS cloud more accessible to Application Developers allowing them to focus on building application logic and delivering business value.

The solution is composed of two parts:

1. AWS Infrastructure to provide the build, deployment, and security requirements in the AWS cloud
2. Backstage plugins to support AWS application development and management.

This solution leverages the flexibility and extensibility of the Backstage platform to provide customizable software templates, scaffolder actions, and boilerplate deployment configurations. While this provides a lot of freedom in implementation, it can be overwhelming to get started.  To help users get started, a reference repository is also provided with samples to show how to use the solution.

## Architecture Overview

See [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for details about the solution architecture

## Prerequisites

- [node.js](https://nodejs.org/en/) - 18.12 or higher
- [yarn](https://classic.yarnpkg.com/en/docs/install) - v1.x
- [aws-cdk](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html#getting_started_install)
- [jq](https://stedolan.github.io/jq/)
- [docker](https://www.docker.com/)

```
The installation instructions documented here were tested using the following versions:
- Backstage v1.10.1
- node v18.12
- npm 8.19
- cdk v2.59
```

## Installation

After cloning this repository, change directory to the repository location and perform the following steps to deploy the complete solution:

1. Install and configure Backstage and plugins
2. Deploy and configure infrastructure prerequisites
3. Build and deploy the Backstage image
4. Deploy and configure the infrastructure solution

### 1. Install and configure Backstage

#### 1.1 Install Backstage
Install backstage into the `backstage/` folder by running the following command.  When prompted for an application name, accept the default value "**backstage**".  Details about installing a new Backstage deployment are available in the [Backstage Getting Started documentation](https://backstage.io/docs/getting-started/).

```sh
npx @backstage/create-app@latest --path ./backstage
```

#### 1.2 Install and Configure Plugins
Copy and overwrite the contents of the `backstage-plugins` folder into the `backstage` folder.  This will place the plugins into the backstage deployment and add custom configurations to the `app-config.production.yaml` file.
The trailing '/' character after `./backstage-plugins/` is required.

```sh
cp -R ./backstage-plugins/ ./backstage
```

From the `backstage` folder, install Backstage plugins:
```sh
# Install the Okta plugin from RoadieHQ
yarn --cwd packages/backend add "@roadiehq/catalog-backend-module-okta"

# Install the Gitlab plugin from ImmobiliareLabs
yarn --cwd packages/backend add "@immobiliarelabs/backstage-plugin-gitlab-backend"
yarn --cwd packages/app add "@immobiliarelabs/backstage-plugin-gitlab"

# Install the AWS Apps plugins
yarn --cwd packages/backend add "@internal/plugin-aws-apps-backend@^0.1.0"
yarn --cwd packages/backend add "@internal/backstage-plugin-scaffolder-backend-module-aws-apps@^0.1.0"
yarn --cwd packages/app add "@internal/plugin-aws-apps@^0.1.0"

# Install the demo app.  The backstage plugin-home plugin is used by the aws-apps-demo plugin
yarn --cwd packages/app add "@backstage/plugin-home"
yarn --cwd packages/app add "@internal/plugin-aws-apps-demo@^0.1.0"
```

Configure Backstage to use the plugins:

- For more information regarding Okta plugin visit RoadieHQ Okta plugin, see [RoadieHQ documentation](https://github.com/RoadieHQ/roadie-backstage-plugins/tree/main/plugins/backend/catalog-backend-module-okta).
- For more information regarding ImmobiliareLabs GitLab plugins, see [ImmobiliareLabs documentation](https://github.com/immobiliare/backstage-plugin-gitlab).
- See the README.md documentation for each of the AWS plugins:
  - [AWS apps backend plugin](/backstage/plugins/aws-apps-backend/README.md)
  - [AWS apps scaffolder actions plugin](/backstage/plugins/scaffolder-backend-module-aws-apps/README.md)
  - [AWS apps frontend plugin](/backstage/plugins/aws-apps/README.md)
  - [AWS Home page and theme demo](/backstage/plugins/aws-apps-demo/README.md)

1. Edit the file `backstage/packages/backend/src/plugins/catalog.ts` with the below modifications:
```ts 
//Add these imports
import { OktaOrgEntityProvider } from '@roadiehq/catalog-backend-module-okta';
import { GitlabFillerProcessor } from '@immobiliarelabs/backstage-plugin-gitlab-backend';
import { AWSEnvironmentEntitiesProcessor, AWSEnvironmentProviderEntitiesProcessor} from '@internal/plugin-aws-apps-backend';


// Add the providers after builder varible creation and before builder.build()

  const orgProvider = OktaOrgEntityProvider.fromConfig(env.config, {
    logger: env.logger,
    userNamingStrategy: 'strip-domain-email',
    groupNamingStrategy: 'kebab-case-name',
  });

  builder.addEntityProvider(orgProvider);

  builder.addProcessor(new GitlabFillerProcessor(env.config));

  // Custom processors
  builder.addProcessor(new AWSEnvironmentEntitiesProcessor());
  builder.addProcessor(new AWSEnvironmentProviderEntitiesProcessor());

```

2. Add `gitlab.ts` file on `backstage/packages/backend/src/plugins` directory.
   paste the content below:
```ts 
import { PluginEnvironment } from '../types'; 
import { Router } from 'express-serve-static-core'; 
import { createRouter } from '@immobiliarelabs/backstage-plugin-gitlab-backend';

export default async function createPlugin(
env: PluginEnvironment): Promise<Router> {
return createRouter({
    logger: env.logger,
    config: env.config,
});
}   
```

3. Edit `backstage/packages/app/src/components/cataog/EntitiyPage.tsx`   
```ts
  // Add the below imports
  import { Entity } from '@backstage/catalog-model';
  import {
  AwsAppPage,
  EntityAppStateCard,
  EntityAppStateCardCloudFormation,
  EntityGeneralInfoCard,
  EntityCloudwatchLogsTable,
  EntityInfrastructureInfoCard,
  EntityAppConfigCard,
  EntityAuditTable,
  } from '@internal/plugin-aws-apps';

  import { isGitlabAvailable } from '@immobiliarelabs/backstage-plugin-gitlab';

  // Add the lines below

  const isCicdApplicable = (entity: Entity) => {
    return isGitlabAvailable(entity) || isGithubActionsAvailable(entity);
  };

  export const isServerlessRestApi = (entity: Entity): boolean => {
    const subType = entity?.metadata?.annotations?.['aws.amazon.com/baws-component-subtype'];
    return 'serverless-rest-api' === subType;
  };
  
  export const isLogsAvailable = (entity: Entity): boolean => {
    return !!entity?.metadata?.annotations?.['aws.amazon.com/baws-task-log-group'] ||
    'serverless-rest-api' === entity?.metadata?.annotations?.['aws.amazon.com/baws-component-subtype'];
  };

// Add plugin UI cards andn page
const awsEcsAppViewContent = (
<Grid container spacing={3} alignItems="stretch">
  {entityWarningContent}
  <Grid item md={6}>
    <EntityAboutCard variant="gridItem" />
  </Grid>
  <Grid item md={6} xs={12}>
    <EntityCatalogGraphCard variant="gridItem" height={400} />
  </Grid>
  <Grid item md={6} xs={12}>
    <EntityLinksCard />
  </Grid>
  <Grid item md={6} xs={12}>
    <EntityGeneralInfoCard />
  </Grid>
  <Grid item md={6} xs={12}>
    <EntityAppStateCard></EntityAppStateCard>
  </Grid>
  <Grid item md={6} xs={12}>
    <EntityAppConfigCard></EntityAppConfigCard>
  </Grid>
  <Grid item md={12} xs={12}>
    <EntityInfrastructureInfoCard />
  </Grid>
</Grid>
);

const awsServerlessRestApiAppViewContent = (
<Grid container spacing={3} alignItems="stretch">
  {entityWarningContent}
  <Grid item md={6}>
    <EntityAboutCard variant="gridItem" />
  </Grid>
  <Grid item md={6} xs={12}>
    <EntityCatalogGraphCard variant="gridItem" height={400} />
  </Grid>
  <Grid item md={6} xs={12}>
    <EntityLinksCard />
  </Grid>
  <Grid item md={6} xs={12}>
    <EntityGeneralInfoCard />
  </Grid>
  <Grid item md={12} xs={12}>
    <EntityAppStateCardCloudFormation> </EntityAppStateCardCloudFormation>
  </Grid>
  <Grid item md={12} xs={12}>
    <EntityInfrastructureInfoCard />
  </Grid>
</Grid>
);

const awsAppViewContent = (
<EntitySwitch>
  <EntitySwitch.Case if={isServerlessRestApi} children={awsServerlessRestApiAppViewContent} />
  <EntitySwitch.Case>{awsEcsAppViewContent}</EntitySwitch.Case>
</EntitySwitch>
);

const awsAppLogsContent = (
<Grid container spacing={3} alignItems="stretch">
  <Grid item md={12} xs={12}>
    <EntityCloudwatchLogsTable />
  </Grid>
</Grid>
);
const auditContent = (
<Grid container spacing={1} alignItems="stretch">
  {entityWarningContent}
  <Grid item md={12} xs={12}>
    <EntityAuditTable />
  </Grid>
</Grid>
);

// add awsEntityPage object
const awsAppEntityPage = (
<EntityLayout>
  <EntityLayout.Route path="/" title="Overview">
    {awsAppViewContent}
  </EntityLayout.Route>
  <EntityLayout.Route path="/ci-cd" title="CI/CD">
    {cicdContent}
  </EntityLayout.Route>
  <EntityLayout.Route path="/logs" title="App Logs" if={isLogsAvailable}>
    {awsAppLogsContent}
  </EntityLayout.Route>
  <EntityLayout.Route path="/audit" title="Audit">
    {auditContent}
  </EntityLayout.Route>
</EntityLayout>
);

// update defaultEntityPage to ->
const defaultEntityPage = (
  <EntityLayout.Route path="/ci-cd" title="CI/CD" if={isCicdApplicable}>
    {cicdContent}
  </EntityLayout.Route>
...
  )
// update the const componentPage to ->
const componentPage = (
<EntitySwitch.Case if={isComponentType('aws-app')}>
    <AwsAppPage>
      {awsAppEntityPage}
    </AwsAppPage>
  </EntitySwitch.Case>
...
)

```

4. Edit `backstage/packages/backend/src/index.ts`
```ts
// Add the below imports
import gitlab from './plugins/gitlab';
import awsApps from './plugins/awsApps'

// After   const createEnv = makeCreateEnv(config); add the below ->
const awsAppsEnv = useHotMemoize(module, () => createEnv('aws-apps-backend'));
const gitlabEnv = useHotMemoize(module, () => createEnv('gitlab'));

// After   const apiRouter = Router(); add the  below ->
apiRouter.use('/gitlab', await gitlab(gitlabEnv));
apiRouter.use('/aws-apps-backend', await awsApps(awsAppsEnv));
```

5. Create plugins reference files - `awsApps.ts`, `gitlab.ts` under `backstage/packages/backend/src/plugins`

```ts
//awsApps.ts
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {createRouter} from '@internal/plugin-aws-apps-backend'
import { Router } from 'express';
import { PluginEnvironment } from '../types';
export default async function createPlugin(env: PluginEnvironment): Promise<Router> {
  // Here is where you will add all of the required initialization code that
  // your backend plugin needs to be able to start!
  // The env contains a lot of goodies, but our router currently only
  // needs a logger
  //   env.identity.getIdentity()
  return await createRouter({
    logger: env.logger,
    userIdentity: env.identity,
  });
}

//gitlab.ts
import { PluginEnvironment } from '../types';
import { Router } from 'express-serve-static-core';
import { createRouter } from '@immobiliarelabs/backstage-plugin-gitlab-backend';

export default async function createPlugin(
    env: PluginEnvironment
): Promise<Router> {
    return createRouter({
        logger: env.logger,
        config: env.config,
    });
}

```


### 2. Deploy Infrastructure Prereq

See the [Infrastructure README.md](/infrastructure/README.md#1-prerequisites) for details about deploying the prereq stack.

### 3. Build and Deploy the Backstage image

After configuration of Backstage and deployment of Infrastructure prereq resources are complete, continue with building and deploying Backstage to the new ECR repository.

The make command below will build a Docker container image and push it to the remote repository.
**Note** You must be logged into your AWS account via CLI in the shell where you run this make command.
```sh
make build-and-deploy-backstage-image
```

### 4. Deploy and Configure the Infrastructure Solution

See the [Infrastructure README.md](./infrastructure/README.md#3-deploy-the-solution-stack) for details about deploying the infrastructure solution stack, GitLab Runner stack, reference repository, and restarting the Backstage service.

### Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

### License

This project is licensed under the Apache-2.0 License.
