<!-- 
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 
-->
# AWS Apps Frontend

This is the frontend UI of the AWS Apps plugin.  An AWS Catalog Page and several entity cards are contributed to the UI from this plugin.

- [Installation](#installation)
- [Configuration](#configuration)
  - [EntityPage customization for AWS apps](#entitypage-customization-for-aws-apps)
  - [AWS Software Catalog Page](#aws-software-catalog-page)
  - [Application State Card](#application-state-card)
  - [Application Configuration Card](#application-configuration-card)
  - [AWS Infrastructure Resources Card](#aws-infrastructure-resources-card)
  - [Application Logs Card](#application-logs-card)
  - [Audit Table Card](#audit-table-card)
- [Links](#links)

## Installation

<!-- See installation details in the [AWS Apps Plugin Install Guide](../../../docs/PLUGIN_INSTALL.md) -->
Install the AWS Apps frontend plugin into your Backstage application:

```sh
# From your Backstage root directory
yarn add --cwd packages/app @aws/plugin-aws-apps-for-backstage@0.1.0
```

## Configuration

Each of the UI components contributed in the AWS Apps frontend plugin can be configured independently and added to your Backstage platform as desired.  Details for adding each type of UI component are found in the sections below.

While you can add cards to any page that you wish to customize in Backstage, a good user-experience would be to customize the EntityPage so that it displays the AWS app-specific cards only when an AWS app entity is viewed.  This can be accomplished by customizing the EntityPage as described below.

### EntityPage customization for AWS apps

To build an AWS app-specific entity presentation, we will rely on identification of a component as being of type "aws-app" (as specified under the `spec.type` configuration in the entity's `catalog-info.yaml` file).

Add the code shown below to `EntityPage.tsx`
```ts
// packages/app/src/components/catalog/EntityPage.tsx

[imports ...]

// Add an import for the UI components from the frontend plugin
import {
  AwsAppPage,
  EntityAppStateCard,
  EntityGeneralInfoCard,
  EntityCloudwatchLogsTable,
  EntityInfrastructureInfoCard,
  EntityAppConfigCard,
  EntityAuditTable,
} from '@aws/plugin-aws-apps-for-backstage';

[...]

// isLogsAvailable is a flag used to determine whether AWS logs are available or not
// It relies on the presence of a specific annotation added to an entity's catalog-info.yaml.
export const isLogsAvailable = (entity: Entity): boolean =>
  !!entity?.metadata?.annotations?.['aws.amazon.com/baws-task-log-group'];

// Create the content for an Overview page to display for an AWS app.
// Customize and rearrange the layout to suit your needs
const awsAppViewContent = (
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
    {/* Add a card to show Gitlab repo access token and git connection info */}
    <Grid item md={6} xs={12}>
      <EntityGeneralInfoCard />
    </Grid>
    {/* Add the Application State card */}
    <Grid item md={6} xs={12}>
      <EntityAppStateCard></EntityAppStateCard>
    </Grid>
    {/* Add the Application Configuration Card */}
    <Grid item md={6} xs={12}>
      <EntityAppConfigCard></EntityAppConfigCard>
    </Grid>
    {/* Add the Infrastructure Resources Card */}
    <Grid item md={12} xs={12}>
      <EntityInfrastructureInfoCard />
    </Grid>
  </Grid>
);

// Create the content to be displayed on a "App Logs" tab for the entity
const awsAppLogsContent = (
  <Grid container spacing={3} alignItems="stretch">
    <Grid item md={12} xs={12}>
      <EntityCloudwatchLogsTable />
    </Grid>
  </Grid>
);

// Create the content to be displayed on a "Audit" tab for the entity
const auditContent = (
  <Grid container spacing={1} alignItems="stretch">
    {entityWarningContent}
    <Grid item md={12} xs={12}>
      <EntityAuditTable />
    </Grid>
  </Grid>
);

[...]

// Set the layout for an AWS app entity
const awsAppEntityPage = (
  <EntityLayout>
    {/* Add an Overview page */}
    <EntityLayout.Route path="/" title="Overview">
      {awsAppViewContent}
    </EntityLayout.Route>
    {/* Add a CI/CD tab if desired.  Adding and configuring a CI/CD tab is out of the scope of AWS Apps configuration.
        For an example using GitLab for CI/CD, see the gitlab plugin(s) in the Backstage plugin marketplace. 
        https://backstage.io/plugins/  */}
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

// Add a new case to the EntitySwitch for the component page so that the
// awsAppEntityPage is displayed for AWS apps
const componentPage = (
  <EntitySwitch>
    <EntitySwitch.Case if={isComponentType('service')}>
      {serviceEntityPage}
    </EntitySwitch.Case>

    <EntitySwitch.Case if={isComponentType('website')}>
      {websiteEntityPage}
    </EntitySwitch.Case>

    {/* Add new case here */}
    <EntitySwitch.Case if={isComponentType('aws-app')}>
      <AwsAppPage>
        {awsAppEntityPage}
      </AwsAppPage>
    </EntitySwitch.Case>

    <EntitySwitch.Case>{defaultEntityPage}</EntitySwitch.Case>
  </EntitySwitch>
);

```
When running the Backstage app, you are now setup for customized views of AWS applications in the platform.

###  AWS Software Catalog Page

The AWS Software Catalog page provides a customized view into the Backstage catalog with a focus on applications deployed to AWS through Backstage.
![AWS Software Catalog Page](../../../docs/images/ui_aws_software_catalog.png 'AWS Software Catalog Page')

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
+     <AppCatalogPage />
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
+       <SidebarItem icon={CloudIcon} to="aws-apps-search-page" text="AWS" />
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

###  Application State Card

The Application State card provides deployment status information including an ability to start and stop the application.
![Application State Card](../../../docs/images/ui_app_state.png 'Application State Card')

For information about placement of this card into the Backstage EntityPage, see the code references to **EntityAppStateCard** in the [EntityPage Customization for AWS Apps](#entitypage-customization-for-aws-apps) section above.

###  Application Configuration Card

The Application Configuration card displays information about the configuration of the application.  In the example below, the application has been deployed as a container in ECS and environment variables defined for the container are shown.  A user can also edit the environment variable configuration.
![Application Configuration Card](../../../docs/images/ui_app_configuration.png 'Application Configuration Card')

For information about placement of this card into the Backstage EntityPage, see the code references to **EntityAppConfigCard** in the [EntityPage Customization for AWS Apps](#entitypage-customization-for-aws-apps) section above.

###  AWS Infrastructure Resources Card

The Infrastructure Resources card gives a user quick access to details about AWS infrastructure resources provisioned for the application.  Resources will vary across applications.  In this example information about logs, task definition, service, and security groups are available.  Additional information for another application may include RDS database details (including connection information) and secrets stored in Secrets Manager and SSM Parameter Store.
![AWS Infrastructure Resources Card](../../../docs/images/ui_aws_infra_resources.png 'AWS Infrastructure Resources Card')

For information about placement of this card into the Backstage EntityPage, see the code references to **EntityInfrastructureInfoCard** in the [EntityPage Customization for AWS Apps](#entitypage-customization-for-aws-apps) section above.

###  Application Logs Card

The Application Logs card provides quick access to CloudWatch logs for the application.
![Application Logs Card](../../../docs/images/ui_app_logs.png 'Application Logs Card')

For information about placement of this card into the Backstage EntityPage, see the code references to **EntityCloudwatchLogsTable** in the [EntityPage Customization for AWS Apps](#entitypage-customization-for-aws-apps) section above.

###  Audit Table Card

The Audit Table card contains audit information related to the application and its usage within Backstage.  Audit information includes actions taken, user, timestamps, assumed roles, account, region, and status results.  
![Audit Table Card](../../../docs/images/ui_audit_table.png 'Audit Table Card')

For information about placement of this card into the Backstage EntityPage, see the code references to **EntityAuditTable** in the [EntityPage Customization for AWS Apps](#entitypage-customization-for-aws-apps) section above.

## Links

- [AWS Apps plugin overview](../../../README.md)
- [Backend part of aws-apps](../aws-apps-backend/README.md)