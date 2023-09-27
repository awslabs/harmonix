<!-- 
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 
-->
# OPA on AWS Frontend

This is the frontend UI of the OPA on AWS plugin.  An AWS Catalog Page and several entity cards are contributed to the UI from this plugin.

- [Installation](#installation)
- [Configuration](#configuration)
  - [EntityPage customization for AWS apps](#entitypage-customization-for-aws-apps)
  - [AWS Software Catalog Page](#aws-software-catalog-page)
- [Links](#links)

## Installation

Install the OPA on AWS frontend plugin into your Backstage application:

```sh
# From your Backstage root directory
yarn add --cwd packages/app @aws/plugin-aws-apps-for-backstage@0.2.0
```

## Configuration

Each of the UI components contributed in the OPA on AWS frontend plugin can be configured independently and added to your Backstage platform as desired.  Details for adding each type of UI component are found in the sections below.

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
+ import { AppCatalogPage } from '@aws/plugin-aws-apps-for-backstage';

[...]

const routes = (
  <FlatRoutes>
    [other Route configurations...]
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
+ import CloudIcon from '@material-ui/icons/Cloud';

[...]
export const Root = ({ children }: PropsWithChildren<{}>) => (
  <SidebarPage>
    <Sidebar>
      <SidebarLogo />
      <SidebarGroup label="Menu" icon={<MenuIcon />}>
        {/* Global nav, not org-specific */}
        <SidebarItem icon={HomeIcon} to="/" text="Home" />
+       <SidebarDivider />
+       <SidebarGroup label="AWS" icon={<MenuIcon />}>
+         <SidebarItem icon={CloudIcon} text="AWS">
+           <SidebarSubmenu title="AWS Catalog">
+             <SidebarSubmenuItem
+               title="Environments"
+               to="aws-apps-search-page/environments?filters[kind]=awsenvironment"
+               icon={useApp().getSystemIcon('kind:domain')}
+             />
+             <SidebarSubmenuItem
+               title="Providers"
+               to="aws-apps-search-page/providers?filters[kind]=awsenvironmentprovider"
+               icon={useApp().getSystemIcon('kind:system')}
+             />
+             <SidebarSubmenuItem
+               title="Apps"
+               to="aws-apps-search-page/apps?filters[kind]=component"
+               icon={useApp().getSystemIcon('kind:component')}
+             />
+             <SidebarSubmenuItem
+               title="Resources"
+               to="aws-apps-search-page/resources?filters[kind]=resource"
+               icon={useApp().getSystemIcon('kind:resource')}
+             />
+           </SidebarSubmenu>
+         </SidebarItem>
+       </SidebarGroup>
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

## Links

- [AWS Apps plugin overview](../../../README.md)
- [Backend part of aws-apps](../aws-apps-backend/README.md)
