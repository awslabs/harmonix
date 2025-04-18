<!-- 
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 
-->
# Harmonix on AWS Frontend

This is the frontend UI plugin for the the Harmonix on AWS plugin set.  An AWS Catalog Page, Harmonix Homepage and several entity cards are contributed to the UI from this plugin.

- [Installation](#installation)
- [Configuration](#configuration)
  - [EntityPage customization for AWS apps](#entitypage-customization-for-aws-apps)
  - [AWS Software Catalog Page](#aws-software-catalog-page)
- [Links](#links)

## Installation

This is for manual installation, if you install the Harmonix platform as a complete suite - git patch will take care of the below configuration.

```sh
# From your Backstage root directory
yarn add --cwd packages/app @aws/plugin-aws-apps-for-backstage@0.4.0
```

## Configuration

Each of the UI components contributed in the Harmonix on AWS frontend plugin can be configured independently and added to your Backstage platform as desired.  Details for adding each type of UI component are found in the sections below.

### EntityPage customization for AWS apps

To build an AWS app-specific entity presentation, we will rely on identification of a component as being of type "aws-app" (as specified under the `spec.type` configuration in the entity's `catalog-info.yaml` file).

Add the code shown below to `EntityPage.tsx`
```ts
// packages/app/src/components/catalog/EntityPage.tsx

[imports ...]

// Add an import for the UI components from the frontend plugin
import {
  AwsEnvironmentPage,
  AwsEnvironmentProviderPage,
  AwsComponentPage,
} from '@aws/plugin-aws-apps-for-backstage';

import { isGitlabAvailable, EntityGitlabContent } from '@immobiliarelabs/backstage-plugin-gitlab';

import {
  EntityGithubActionsContent,
  isGithubActionsAvailable,
} from '@backstage-community/plugin-github-actions';


[...]

// Add these statements
const isCicdApplicable = (entity: Entity) => {
  return isGitlabAvailable(entity) || isGithubActionsAvailable(entity);

const awsEnvironmentProviderEntityPage = (
      <AwsEnvironmentProviderPage />
);

const awsEnvironmentEntityPage = (
      <AwsEnvironmentPage />
);

const resourceEntityPage = (
  <EntitySwitch>
    <EntitySwitch.Case if={isResourceType('aws-resource')}>
       <AwsComponentPage componentType='aws-resource'/>
    </EntitySwitch.Case>
    <EntitySwitch.Case>{defaultEntityPage}</EntitySwitch.Case>
  </EntitySwitch>
);

// Add GitLab support
const cicdContent = (
  ...
  <EntitySwitch>
    ...
  // Add this to the switch statement in the cicdContent variable
    <EntitySwitch.Case if={isGithubActionsAvailable}>
      <EntityGithubActionsContent />
    </EntitySwitch.Case>
    <EntitySwitch.Case if={isGitlabAvailable}>
      <EntityGitlabContent />
    </EntitySwitch.Case>
    ...
  </EntitySwitch>
);

// Add a CI/CD tab to the defaultEntityPage variable
const defaultEntityPage = (
  <EntityLayout>
    ...
    // Add this route
    <EntityLayout.Route path="/ci-cd" title="CI/CD" if={isCicdApplicable}>
      {cicdContent}
    </EntityLayout.Route>
    ...
  </EntityLayout>
);

// Add a new case element to the component page to show aws-app components
const componentPage = (
  <EntitySwitch>
    ...
    // Add this case inside the EntitySwitch element
    <EntitySwitch.Case if={isComponentType('aws-app')}>
      <AwsComponentPage componentType='aws-app'/>
    </EntitySwitch.Case>
    ...
  </EntitySwitch>
);

// Add support for aws resource, environment and environment provider specific entity pages
// to the entityPage variable
const resourceEntityPage = (
  <EntitySwitch>
    ...
    <EntitySwitch.Case if={isKind('resource')} children={resourceEntityPage} />
    <EntitySwitch.Case if={isKind('awsenvironment')} children={awsEnvironmentEntityPage} />
    <EntitySwitch.Case if={isKind('awsenvironmentprovider')} children={awsEnvironmentProviderEntityPage} />
    ...
  </EntitySwitch>
);

```
When running the Backstage app, you are now setup for customized views of AWS applications in the platform.

###  AWS Software Catalog Page

The AWS Software Catalog page provides a customized view into the Backstage catalog with a focus on applications deployed to AWS through Backstage.
![AWS Software Catalog Page](images/ui_aws_software_catalog.png 'AWS Software Catalog Page')

To create the AWS Software Catalog Page in your Backstage app, add the **AppCatalogPage** JSX Element to the Backstage `App.tsx` file.  
It should be configured as a new `<Route ...>` in the file.

```diff
// packages/app/src/App.tsx

[imports...]
+import { oktaAuthApiRef } from '@backstage/core-plugin-api';
+import { AppCatalogPage } from '@aws/plugin-aws-apps-for-backstage';
+import { HarmonixHomePage } from '@aws/plugin-aws-apps-for-backstage/src/demo/HarmonixHomePage/HarmonixHomePage';

[...]

const app = createApp({
   apis,
     });
   },
   components: {
-    SignInPage: props => <SignInPage {...props} auto providers={['guest']} />,
+    // SignInPage: props => <SignInPage {...props} auto providers={['guest']} />,
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
   },
 });

 [...]

const routes = (
  <FlatRoutes>
    [other Route configurations...]
-    <Route path="/" element={<Navigate to="catalog" />} />
+    <Route path="/" element={<Navigate to="home" />} />
+    <Route path="/home" element={<HarmonixHomePage/>} />
+   <Route path="/aws-apps-search-page" element={<CatalogIndexPage />}>
+     <AppCatalogPage kind="all" />
+   </Route>
+   <Route path="/aws-apps-search-page/environments" element={<CatalogIndexPage />}>
+     <AppCatalogPage kind="awsenvironment" />
+   </Route>
+   <Route path="/aws-apps-search-page/providers" element={<CatalogIndexPage />}>
+     <AppCatalogPage kind="awsenvironmentprovider" />
+   </Route>
+   <Route path="/aws-apps-search-page/apps" element={<CatalogIndexPage />}>
+     <AppCatalogPage kind="component" />
+   </Route>
+   <Route path="/aws-apps-search-page/resources" element={<CatalogIndexPage />}>
+     <AppCatalogPage kind="resource" />
+   </Route>
  </FlatRoutes>
);

```

Next, add the AWS Software Catalog to the sidebar navigation in the `Root.tsx` file.  
Determine your preferred placement in the sidebar using the example below as guidance.  Exact contents and children of the <SidebarPage> may differ in your installation.

```diff
// packages/app/src/components/Root/Root.tsx

[imports...]
SidebarSpace,
   useSidebarOpenState,
   Link,
+  SidebarSubmenu,
+  SidebarSubmenuItem,
+  CatalogIcon,
 } from '@backstage/core-components';
 import MenuIcon from '@material-ui/icons/Menu';
 import SearchIcon from '@material-ui/icons/Search';
 import { MyGroupsSidebarItem } from '@backstage/plugin-org';
 import GroupIcon from '@material-ui/icons/People';
+import CloudIcon from '@material-ui/icons/Cloud';
+import { useApp } from '@backstage/core-plugin-api';

[...]
export const Root = ({ children }: PropsWithChildren<{}>) => (
  <SidebarPage>
    <Sidebar>
      <SidebarLogo />
      <SidebarGroup label="Menu" icon={<MenuIcon />}>
 -        <SidebarItem icon={HomeIcon} to="catalog" text="Home" />
+        <SidebarItem icon={HomeIcon} to="/home" text="Home" />
+        <SidebarItem icon={CatalogIcon} to="/catalog" text="Catalog" />
+        <SidebarDivider />
+        <SidebarGroup label="AWS" icon={<MenuIcon />}>
+          <SidebarItem icon={CloudIcon} text="AWS">
+            <SidebarSubmenu title="AWS Catalog">
+              <SidebarSubmenuItem
+                title="Environments"
+                to="aws-apps-search-page/environments?filters[kind]=awsenvironment"
+                icon={useApp().getSystemIcon('kind:domain')}
+              />
+              <SidebarSubmenuItem
+                title="Providers"
+                to="aws-apps-search-page/providers?filters[kind]=awsenvironmentprovider"
+                icon={useApp().getSystemIcon('kind:system')}
+              />
+              <SidebarSubmenuItem
+                title="Apps"
+                to="aws-apps-search-page/apps?filters[kind]=component"
+                icon={useApp().getSystemIcon('kind:component')}
+              />
+              <SidebarSubmenuItem
+                title="Resources"
+                to="aws-apps-search-page/resources?filters[kind]=resource"
+                icon={useApp().getSystemIcon('kind:resource')}
+              />
+            </SidebarSubmenu>
+          </SidebarItem>
+        </SidebarGroup>
        <SidebarItem icon={LibraryBooks} to="docs" text="Docs" />
        <SidebarItem icon={CreateComponentIcon} to="create" text="Create..." />
        {/* End global nav */}
      </SidebarGroup>
      <SidebarGroup label="Settings" icon={<UserSettingsSignInAvatar />} to="/settings">
        <SidebarSettings />
      </SidebarGroup>
    </Sidebar>
    {children}
  </SidebarPage>
);

```

```diff
// packages/app/src/components/catalog/EntityPage.tsx

[imports...]

   isOrphan,
   hasRelationWarnings,
   EntityRelationWarning,
+  isResourceType,
 } from '@backstage/plugin-catalog';
 import {
   EntityUserProfileCard,
   EntityCatalogGraphCard,
 } from '@backstage/plugin-catalog-graph';
 import {
+  Entity,
   RELATION_API_CONSUMED_BY,
   RELATION_API_PROVIDED_BY,
   RELATION_CONSUMES_API,
   RELATION_PROVIDES_API,
 } from '@backstage/catalog-model';
 
+import {
+  AwsEnvironmentPage,
+  AwsEnvironmentProviderPage,
+  AwsComponentPage,
+} from '@aws/plugin-aws-apps-for-backstage';
+
+import { isGitlabAvailable, EntityGitlabContent } from '@immobiliarelabs/backstage-plugin-gitlab';
+
+import {
+  EntityGithubActionsContent,
+  isGithubActionsAvailable,
+} from '@backstage-community/plugin-github-actions';
+
+const isCicdApplicable = (entity: Entity) => {
+  return isGitlabAvailable(entity) || isGithubActionsAvailable(entity);
+}
+



[...]
         <EntityGithubActionsContent />
       </EntitySwitch.Case>
      */}
+    <EntitySwitch.Case if={isGithubActionsAvailable}>
+      <EntityGithubActionsContent />
+    </EntitySwitch.Case>
+    <EntitySwitch.Case if={isGitlabAvailable}>
+      <EntityGitlabContent />
+    </EntitySwitch.Case>
     <EntitySwitch.Case>
       <EmptyState
         title="No CI/CD available for this entity"
[...]
       {overviewContent}
     </EntityLayout.Route>
 
+    <EntityLayout.Route path="/ci-cd" title="CI/CD" if={isCicdApplicable}>
+      {cicdContent}
+    </EntityLayout.Route>
+
     <EntityLayout.Route path="/docs" title="Docs">
       {techdocsContent}
     </EntityLayout.Route>
[...]
       {serviceEntityPage}
     </EntitySwitch.Case>
 
+    <EntitySwitch.Case if={isComponentType('aws-app')}>
+      <AwsComponentPage componentType='aws-app' />
+    </EntitySwitch.Case>
+
     <EntitySwitch.Case if={isComponentType('website')}>
       {websiteEntityPage}
     </EntitySwitch.Case>
[...]
   </EntityLayout>

   +const awsEnvironmentProviderEntityPage = (
+  <AwsEnvironmentProviderPage />
+);
+
+const awsEnvironmentEntityPage = (
+  <AwsEnvironmentPage />
+);
+
+const resourceEntityPage = (
+  <EntitySwitch>
+    <EntitySwitch.Case if={isResourceType('aws-resource')}>
+      <AwsComponentPage componentType='aws-resource' />
+    </EntitySwitch.Case>
+    <EntitySwitch.Case>{defaultEntityPage}</EntitySwitch.Case>
+  </EntitySwitch>
+);

export const entityPage = (
   <EntitySwitch>
     <EntitySwitch.Case if={isKind('component')} children={componentPage} />
+    <EntitySwitch.Case if={isKind('resource')} children={resourceEntityPage} />
+    <EntitySwitch.Case if={isKind('awsenvironment')} children={awsEnvironmentEntityPage} />
+    <EntitySwitch.Case if={isKind('awsenvironmentprovider')} children={awsEnvironmentProviderEntityPage} />
     <EntitySwitch.Case if={isKind('api')} children={apiPage} />
     <EntitySwitch.Case if={isKind('group')} children={groupPage} />
     <EntitySwitch.Case if={isKind('user')} children={userPage} />

```



## Plugin Dependency
This backstage backend plugin depends on other Harmonix plugins - in order to compile the code properly, make sure all dependencies are installed and configured properly.


## Links

- [AWS Apps plugin overview](../../../README.md)
- [Backend part of aws-apps](../aws-apps-backend/README.md)
