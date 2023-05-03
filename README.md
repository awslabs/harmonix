# App Development for Backstage<!-- -->.io on AWS

**App Development for Backstage<!-- -->.io on AWS** provides a new developer experience to simplify the use and consumption of AWS services while minimizing required expertise in cloud infrastructure technologies.
Built on the [Backstage open platform](https://backstage.io), this solution makes the AWS cloud more accessible to Application Developers allowing them to focus on building application logic and delivering business value.

The solution is composed of two parts:

1. AWS Infrastructure to provide the build, deployment, and security requirements in the AWS cloud
2. Backstage plugins to support AWS application development and management.

This solution leverages the flexibility and extensibility of the Backstage platform to provide customizable software templates, scaffolder actions, and boilerplate deployment configurations. While this provides a lot of freedom in implementation, it can be overwhelming to get started.  To help users get started, a reference repository is also provided with samples to show how to use the solution.

## Content

1. Architecture overview
2. Installation instructions
3. Q.A

## 1. Architecture Overview

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

## 2. Installation

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
yarn --cwd packages/backend add "@aws/plugin-aws-apps-backend-for-backstage@^0.1.0"
yarn --cwd packages/backend add "@aws/plugin-scaffolder-backend-aws-apps-for-backstage@^0.1.0"
yarn --cwd packages/app add "@aws/plugin-aws-apps-for-backstage@^0.1.0"

# Install the demo app.  The backstage plugin-home plugin is used by the aws-apps-demo plugin
yarn --cwd packages/app add "@backstage/plugin-home"
yarn --cwd packages/app add "@aws/plugin-aws-apps-demo-for-backstage@^0.1.0"
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
```diff
//Add these imports
+ import { OktaOrgEntityProvider } from '@roadiehq/catalog-backend-module-okta';
+ import { GitlabFillerProcessor } from '@immobiliarelabs/backstage-plugin-gitlab-backend';
+ import { AWSEnvironmentEntitiesProcessor, AWSEnvironmentProviderEntitiesProcessor} from '@aws/plugin-aws-apps-backend-for-backstage';

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
   const builder = await CatalogBuilder.create(env);  
+  const orgProvider = OktaOrgEntityProvider.fromConfig(env.config, {
+    logger: env.logger,
+    userNamingStrategy: 'strip-domain-email',
+    groupNamingStrategy: 'kebab-case-name',
+  });

+  builder.addEntityProvider(orgProvider);

   builder.addProcessor(new ScaffolderEntitiesProcessor());

+  // Custom processors
+  builder.addProcessor(new GitlabFillerProcessor(env.config));
+  builder.addProcessor(new AWSEnvironmentEntitiesProcessor());
+  builder.addProcessor(new AWSEnvironmentProviderEntitiesProcessor());

   const { processingEngine, router } = await builder.build();
+  orgProvider.run();
   await processingEngine.start();

   return router;
}

```

2. Add scaffolder actions to the `scaffolder.ts` file

```diff
// backstage/packages/backend/src/plugins/scaffolder.ts

import { CatalogClient } from '@backstage/catalog-client';
import { createRouter } from '@backstage/plugin-scaffolder-backend';
+ import { createBuiltinActions } from '@backstage/plugin-scaffolder-backend';
import { Router } from 'express';
import type { PluginEnvironment } from '../types';
+ import { ScmIntegrations } from '@backstage/integration';
+ import {
+   createBawsDeployBoilerplateAction,
+   createRepoAccessTokenAction,
+   createSecretAction,
+   createS3BucketAction,
+   getEnvProvidersAction,
+   getComponentInfoAction,
+   getSsmParametersAction,
+ } from '@aws/plugin-scaffolder-backend-aws-apps-for-backstage';

export default async function createPlugin(env: PluginEnvironment): Promise<Router> {
  const catalogClient = new CatalogClient({
    discoveryApi: env.discovery,
  });

+  const integrations = ScmIntegrations.fromConfig(env.config);

+  const builtInActions = createBuiltinActions({
+    integrations,
+    catalogClient,
+    reader: env.reader,
+    config: env.config,
+  });

+  const actions = [
+     ...builtInActions,
+    createBawsDeployBoilerplateAction({ catalogClient }),
+    createRepoAccessTokenAction({ integrations }),
+    createS3BucketAction(),
+    createSecretAction(),
+    getEnvProvidersAction({ catalogClient }),
+    getComponentInfoAction(),
+    getSsmParametersAction(),
+  ];

  return await createRouter({
    logger: env.logger,
    config: env.config,
    database: env.database,
    reader: env.reader,
    catalogClient,
    identity: env.identity,
+    actions,
  });
}
```

3. Add `gitlab.ts` file in `backstage/packages/backend/src/plugins` directory.
   paste the content below:
```ts 
//gitlab.ts
import { PluginEnvironment } from '../types';
import { Router } from 'express-serve-static-core';
import { createRouter } from '@immobiliarelabs/backstage-plugin-gitlab-backend';

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  return createRouter({
    logger: env.logger,
    config: env.config,
  });
} 
```

4. Add `awsApps.ts` file in the `backstage/packages/backend/src/plugins` directory.
   Paste the content below:

```ts
// awsApps.ts
import {createRouter} from '@aws/plugin-aws-apps-backend-for-backstage'
import { Router } from 'express';
import { PluginEnvironment } from '../types';

export default async function createPlugin(env: PluginEnvironment): Promise<Router> {
  return await createRouter({
    logger: env.logger,
    userIdentity: env.identity,
  });
}
```

5. Edit `backstage/packages/app/src/components/catalog/EntityPage.tsx`   
```ts
// Add the below imports
import { Entity } from '@backstage/catalog-model';
import {
  AwsAppPage,
  EntityCustomGitlabContent,
  EntityAppStateCard,
  EntityAppStateCardCloudFormation,
  EntityGeneralInfoCard,
  EntityCloudwatchLogsTable,
  EntityInfrastructureInfoCard,
  EntityAppConfigCard,
  EntityAuditTable,
} from '@aws/plugin-aws-apps-for-backstage';
import { isGitlabAvailable } from '@immobiliarelabs/backstage-plugin-gitlab';

// Add the following const variables after the import statements
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

// Add the GitLab CI/CD content to the entity page
const cicdContent = (
  // This is an example of how you can implement your company's logic in entity page.
  // You can for example enforce that all components of type 'service' should use GitHubActions
  <EntitySwitch>
    [... GitHub configuration ...]
    
    {/* Add a switch entity for GitLab here*/}
    <EntitySwitch.Case if={isGitlabAvailable}>
      <EntityCustomGitlabContent />
    </EntitySwitch.Case>
    
    [... Remaining CI/CD configuration(s) ...]
    

// Add plugin UI cards and page.  These should be added after the declaration of the 'entityWarningContent'
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
    <EntityAppStateCardCloudFormation />
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

// update defaultEntityPage to include an EntityLayout.Route for /ci-cd->
const defaultEntityPage = (
  <EntityLayout.Route path="/ci-cd" title="CI/CD" if={isCicdApplicable}>
    {cicdContent}
  </EntityLayout.Route>
...
  )
// update the const componentPage to include an EntitySwitch.Case for aws-app component types ->
const componentPage = (
  <EntitySwitch.Case if={isComponentType('aws-app')}>
    <AwsAppPage>
      {awsAppEntityPage}
    </AwsAppPage>
  </EntitySwitch.Case>
...
)

```

6. Edit `backstage/packages/backend/src/index.ts`

```ts
// Add the below imports
import gitlab from './plugins/gitlab';
import awsApps from './plugins/awsApps';

// After   const createEnv = makeCreateEnv(config); add the below ->
const awsAppsEnv = useHotMemoize(module, () => createEnv('aws-apps-backend'));
const gitlabEnv = useHotMemoize(module, () => createEnv('gitlab'));

// After   const apiRouter = Router(); add the  below ->
apiRouter.use('/gitlab', await gitlab(gitlabEnv));
apiRouter.use('/aws-apps-backend', await awsApps(awsAppsEnv));
```

7. Edit `packages/app/src/components/Root/Root.tsx`

```diff
// import the below
+ import CloudIcon from '@material-ui/icons/Cloud';

// update to the code below to add a SidebarItem pointing to the AWS apps search page
export const Root = ({ children }: PropsWithChildren<{}>) => (
  <SidebarPage>
    <Sidebar>
      <SidebarLogo />
      <SidebarGroup label="Search" icon={<SearchIcon />} to="/search">
        <SidebarSearchModal />
      </SidebarGroup>
      <SidebarDivider />
      <SidebarGroup label="Menu" icon={<MenuIcon />}>
        {/* Global nav, not org-specific */}
        <SidebarItem icon={HomeIcon} to="/" text="Home" />
+       <SidebarItem icon={CloudIcon} to="aws-apps-search-page" text="AWS" />
        <SidebarItem icon={ExtensionIcon} to="api-docs" text="APIs" />
        <SidebarItem icon={LibraryBooks} to="docs" text="Docs" />
        <SidebarItem icon={CreateComponentIcon} to="create" text="Create..." />
        {/* End global nav */}
        <SidebarDivider />
        <SidebarScrollWrapper>
          <SidebarItem icon={MapIcon} to="tech-radar" text="Tech Radar" />
        </SidebarScrollWrapper>
      </SidebarGroup>
      <SidebarSpace />
      <SidebarDivider />
      <SidebarGroup label="Settings" icon={<UserSettingsSignInAvatar />} to="/settings">
        <SidebarSettings />
      </SidebarGroup>
    </Sidebar>
    {children}
  </SidebarPage>
);
```

8. Edit `packages/app/src/App.tsx`
```diff
// Add the import below
+ import { AppCatalogPage } from '@aws/plugin-aws-apps-for-backstage';
+ import {SignInPage} from '@backstage/core-components'
+ import { oktaAuthApiRef } from '@backstage/core-plugin-api';

// Modify the createApp function as shown below to add a sign in page
const app = createApp({
  apis,
+  components: {
+    SignInPage: props => {
+      return (
+        <SignInPage
+          {...props}
+          auto
+          providers={[
+            {
+              id: 'okta-auth-provider',
+              title: 'Okta',
+              message: 'Sign in using Okta credentials',
+              apiRef: oktaAuthApiRef,
+            },
+          ]}
+        />
+      );
+    },
+  },

// Add the Route reference for /aws-apps-search-page as shown below
[...]
const routes = (
  <FlatRoutes>
    [other Route configurations...]
+   <Route path="/aws-apps-search-page" element={<CatalogIndexPage />}>
+     <AppCatalogPage />
+   </Route>
  </FlatRoutes>
);
```

9. Edit `packages/backend/src/plugins/auth.ts`

```ts
// Add the Okta auth provider to the providerFactories as shown below (after the github provider)

      okta: providers.okta.create({
        signIn: {
          // resolver: providers.okta.resolvers.emailMatchingUserEntityAnnotation(),
          resolver: async (info, ctx) => {
            const {
              profile: { email },
            } = info;
            if (!email) {
              throw new Error('User profile contained no email');
            }
            const [name] = email.split('@');
            return ctx.signInWithCatalogUser({
              entityRef: { name }
            });
          }
        },
      }),
```


### 2. Deploy Infrastructure

See the [Infrastructure README.md](/infrastructure/README.md#1-prerequisites) for details about deploying the infrastructure stacks.

### Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

### License

This project is licensed under the Apache-2.0 License.

## 3. Q.A

Q. I don't use Okta. Can i change the identity provider to another one? <br>
A Yes, Backstage [supports many IDPs](https://backstage.io/docs/auth/), once you configure backstage to your chosen IDP make sure backstage catalog is synced with the users and groups from your IDP. don't forget to update the security role mapping to match the groups in your IDP to the AWS environment roles.
<br><br>

Q. I want to use another source control that is not GitLabs. how can i do it?<br>
A. Backstage support different source control which can be integrated through backstage config. we use Gitlab for several usage which will need to migrate to another source control provider:
1. Storing application source code
2. Storing template source code
3. Storing catalog information - AWS Environment and AWS Environment providers
4. Executing pipelines that are responsible to build the application when new code is pushed and push the updated image to ECR.
<br><br>

Q. I'm using Terraform, can i use this solution with terraform to provision application resources?<br>
A. Yes, the step function which is responsible to provision resource for a given Environment can also execute terraform modules. Since it's using AWS CodeBuild behind the scene you can introduce your own software for provisioning resources but also enjoy some of the built-in implementation like passing Environment variables in and out of the step function.