// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  createPlugin,
  createApiFactory,
  configApiRef,
  createComponentExtension,
  fetchApiRef,
} from '@backstage/core-plugin-api';
import { Entity } from '@backstage/catalog-model';
import { rootRouteRef } from './routes';
import { OPAApiClient, opaApiRef } from './api';

export const isOPAAppAvailable = (entity: Entity) => entity?.spec?.type === 'aws-app';
export const isAnnotationsAvailable = (entity: Entity) => entity?.metadata?.annotations;
export const isLabelsAvailable = (entity: Entity) => entity?.metadata?.labels;

export const harmonixFrontendPlugin = createPlugin({
  id: 'harmonix-frontend',
  apis: [
    createApiFactory({
      api: opaApiRef,
      deps: { configApi: configApiRef, fetchApi: fetchApiRef },
      factory: ({ configApi, fetchApi }) => new OPAApiClient({ configApi, fetchApi }),
    }),
  ],
  routes: {
    root: rootRouteRef,
  },
});

export const EntityLabelTable = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'EntityLabelTable',
    component: {
      lazy: () => import('./components/LabelTable/LabelTable').then(m => m.LabelWidget),
    },
  }),
);

export const EntityAuditTable = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'EntityAuditTable',
    component: {
      lazy: () => import('./components/AuditTable/AuditTable').then(m => m.AuditWidget),
    },
  }),
);

export const EntityEnvironmentSelector = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'EnvironmentSelector',
    component: {
      lazy: () => import('./components/EnvironmentSelector/EnvironmentSelector').then(m => m.EnvironmentSelectorWidget),
    },
  }),
);

export const EntityAnnotationTypeTable = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'EntityAnnotationTypeTable',
    component: {
      lazy: () => import('./components/AnnotationTypeTable/AnnotationTypeTable').then(m => m.AnnotationWidget),
    },
  }),
);

export const EntityAppStateCard = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'AppStateCard',
    component: {
      lazy: () => import('./components/AppStateCard/AppStateCard').then(m => m.AppStateCard),
    },
  }),
);

export const EntityK8sAppStateCard = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'K8sAppStateCard',
    component: {
      lazy: () => import('./components/K8sAppStateCard/K8sAppStateCard').then(m => m.K8sAppStateCard),
    },
  }),
);

export const EntityAppStateCardCloudFormation = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'AppStateCardCloudFormation',
    component: {
      lazy: () => import('./components/AppStateCardCloudFormation/AppStateCardCloudFormation').then(m => m.AppStateCard),
    },
  }),
);

export const EntityGeneralInfoCard = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'GeneralInfoCard',
    component: {
      lazy: () => import('./components/GeneralInfoCard/GeneralInfoCard').then(m => m.GeneralInfoCard),
    },
  }),
);

export const EntityAppPromoCard = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'AppPromoCard',
    component: {
      lazy: () => import('./components/AppPromoCard/AppPromoCard').then(m => m.AppPromoWidget),
    },
  }),
);

export const EntityAppLinksCard = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'AppLinksCard',
    component: {
      lazy: () => import('./components/AppLinksCard/AppLinksCard').then(m => m.AppLinksCard),
    },
  }),
);

export const AppCatalogPage = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'AppCatalogPage',
    component: {
      lazy: () => import('./components/AppCatalogPage/AppCatalogPage').then(m => m.AppCatalogPage),
    },
  }),
);

export const EntityCloudwatchLogsTable = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'EntityCloudwatchLogsTable',
    component: {
      lazy: () => import('./components/CloudwatchLogsTable/CloudwatchLogsTable').then(m => m.CloudwatchLogsWidget),
    },
  }),
);

export const EntityInfrastructureInfoCard = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'InfrastructureInfoCard',
    component: {
      lazy: () => import('./components/InfrastructureCard/InfrastructureCard').then(m => m.InfrastructureCard),
    },
  }),
);


export const EntityProviderInfoCard = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'ProviderInfoCard',
    component: {
      lazy: () => import('./components/ProviderInfoCard/ProviderInfoCard').then(m => m.ProviderInfoCard),
    },
  }),
);

export const EntityEnvironmentInfoCard = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'EnvironmentInfoCard',
    component: {
      lazy: () => import('./components/EnvironmentInfoCard/EnvironmentInfoCard').then(m => m.EnvironmentInfoCard),
    },
  }),
);

export const EntityAppConfigCard = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'AppConfigCard',
    component: {
      lazy: () => import('./components/AppConfigCard/AppConfigCard').then(m => m.AppConfigCard),
    },
  }),
);

export const EntityDeleteAppCard = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'DeleteAppCard',
    component: {
      lazy: () => import('./components/DeleteComponentCard/DeleteComponentCard').then(m => m.DeleteComponentCard),
    },
  }),
);

export const EntityDeleteProviderCard = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'DeleteProviderCard',
    component: {
      lazy: () => import('./components/DeleteProviderCard/DeleteProviderCard').then(m => m.DeleteProviderCard),
    },
  }),
);

export const EntityDeleteEnvironmentCard = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'DeleteEnvironmentCard',
    component: {
      lazy: () => import('./components/DeleteEnvironmentCard/DeleteEnvironmentCard').then(m => m.DeleteEnvironmentCard),
    },
  }),
);

export const EntityResourceBindingCard = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'ResourceBindingCard',
    component: {
      lazy: () => import('./components/ResourceBindingCard/ResourceBinding').then(m => m.ResourceBindingCardWidget),
    },
  }),
);

export const EntityAwsEnvironmentProviderSelectorCard = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'AwsEnvironmentProviderSelectorCard',
    component: {
      lazy: () => import('./components/AwsEnvironmentProviderCard/AwsEnvironmentProviderCard').then(m => m.AwsEnvironmentProviderCardWidget),
    },
  }),
);

export const AwsAppPage = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'AwsAppPage',
    component: {
      lazy: () => import('./pages/AwsAppPage/AwsAppPage').then(m => m.AwsAppPage),
    },
  }),
);

export const AwsComponentPage = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'AwsComponentPage',
    component: {
      lazy: () => import('./pages/AwsComponentPage/AwsComponentPage').then(m => m.AwsComponentPage),
    },
  }),
);

export const AwsEnvironmentPage = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'AwsEnvironmentPage',
    component: {
      lazy: () => import('./pages/AwsEnvironmentPage/AwsEnvironmentPage').then(m => m.AwsEnvironmentPage),
    },
  }),
);

export const AwsEnvironmentProviderPage = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'AwsEnvironmentProviderPage',
    component: {
      lazy: () => import('./pages/AwsEnvironmentProviderPage/AwsEnvironmentProviderPage').then(m => m.AwsEnvironmentProviderPage),
    },
  }),
);


export const AwsECSAppPage = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'AwsECSAppPage',
    component: {
      lazy: () => import('./pages/AwsECSAppPage/AwsECSAppPage').then(m => m.AwsECSAppPage),
    },
  }),
);

export const AwsECSEnvironmentProviderPage = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'AwsECSEnvironmentProviderPage',
    component: {
      lazy: () => import('./pages/AwsECSEnvironmentProviderPage/AwsECSEnvironmentProviderPage').then(m => m.AwsECSEnvironmentProviderPage),
    },
  }),
);

export const AwsEKSAppPage = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'AwsEKSAppPage',
    component: {
      lazy: () => import('./pages/AwsEKSAppPage/AwsEKSAppPage').then(m => m.AwsEKSAppPage),
    },
  }),
);

export const AwsEKSEnvironmentProviderPage = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'AwsEKSEnvironmentProviderPage',
    component: {
      lazy: () => import('./pages/AwsEKSEnvironmentProviderPage/AwsEKSEnvironmentProviderPage').then(m => m.AwsEKSEnvironmentProviderPage),
    },
  }),
);

export const AwsPendingPage = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'AwsPendingPage',
    component: {
      lazy: () => import('./pages/AwsPendingPage/AwsPendingPage').then(m => m.AwsPendingPage),
    },
  }),
);

export const AwsRDSResourcePage = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'AwsRDSResourcePage',
    component: {
      lazy: () => import('./pages/AwsRDSResourcePage/AwsRDSResourcePage').then(m => m.AwsRDSResourcePage),
    },
  }),
);

export const AwsResourcePage = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'AwsResourcePage',
    component: {
      lazy: () => import('./pages/AwsResourcePage/AwsResourcePage').then(m => m.AwsResourcePage),
    },
  }),
);

export const AwsS3ResourcePage = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'AwsS3ResourcePage',
    component: {
      lazy: () => import('./pages/AwsS3ResourcePage/AwsS3ResourcePage').then(m => m.AwsS3ResourcePage),
    },
  }),
);

export const AwsSecretsManagerResourcePage = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'AwsSecretsManagerResourcePage',
    component: {
      lazy: () => import('./pages/AwsSecretsManagerResourcePage/AwsSecretsManagerResourcePage').then(m => m.AwsSecretsManagerResourcePage),
    },
  }),
);

export const AwsServerlessAppPage = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'AwsServerlessAppPage',
    component: {
      lazy: () => import('./pages/AwsServerlessAppPage/AwsServerlessAppPage').then(m => m.AwsServerlessAppPage),
    },
  }),
);

export const AwsServerlessEnvironmentProviderPage = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'AwsServerlessEnvironmentProviderPage',
    component: {
      lazy: () => import('./pages/AwsServerlessEnvironmentProviderPage/AwsServerlessEnvironmentProviderPage').then(m => m.AwsServerlessEnvironmentProviderPage),
    },
  }),
);


export const AWSLogoFull = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'AWSLogoFull',
    component: { lazy: () => import('../../harmonix-frontend/src/demo/AWSLogoFull').then(m => m.AWSLogoFull) },
  }),
);

export const AWSLogoIcon = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'AWSLogoIcon',
    component: { lazy: () => import('../../harmonix-frontend/src/demo/AWSLogoIcon').then(m => m.AWSLogoIcon) },
  }),
);

export const OPALogoFull = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'OPALogoFull',
    component: { lazy: () => import('../../harmonix-frontend/src/demo/OPALogoFull').then(m => m.OPALogoFull) },
  }),
);

export const OPALogoIcon = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'OPALogoIcon',
    component: { lazy: () => import('../../harmonix-frontend/src/demo/OPALogoIcon').then(m => m.OPALogoIcon) },
  }),
);

export const CustomerLogoIcon = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'CustomerLogoIcon',
    component: { lazy: () => import('../../harmonix-frontend/src/demo/CustomerLogoIcon').then(m => m.CustomerLogoIcon) },
  }),
);
export const CustomerLogoFullTitleLight = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'CustomerLogoFullTitleLight',
    component: {
      lazy: () => import('../../harmonix-frontend/src/demo/CustomerLogoFullTitleLight').then(m => m.CustomerLogoFullTitleLight),
    },
  }),
);
export const CustomerLogoFullLight = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'CustomerLogoFullLight',
    component: { lazy: () => import('../../harmonix-frontend/src/demo/CustomerLogoFullLight').then(m => m.CustomerLogoFullLight) },
  }),
);

export const AWSAppsHomePage = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'AWSAppsHomePage',
    component: {
      lazy: () => import('../../harmonix-frontend/src/demo/AWSAppsHomePage/AWSAppsHomePage').then(m => m.AWSAppsHomePage),
    },
  }),
);

export const OPAHomePage = harmonixFrontendPlugin.provide(
  createComponentExtension({
    name: 'AWSAppsHomePage',
    component: {
      lazy: () => import('../../harmonix-frontend/src/demo/OPAHomePage/OPAHomePage').then(m => m.OPAHomePage),
    },
  }),
);