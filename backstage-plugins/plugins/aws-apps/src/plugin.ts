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

export const opaPlugin = createPlugin({
  id: 'aws-apps',
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

export const EntityLabelTable = opaPlugin.provide(
  createComponentExtension({
    name: 'EntityLabelTable',
    component: {
      lazy: () => import('./components/LabelTable/LabelTable').then(m => m.LabelWidget),
    },
  }),
);

export const EntityAuditTable = opaPlugin.provide(
  createComponentExtension({
    name: 'EntityAuditTable',
    component: {
      lazy: () => import('./components/AuditTable/AuditTable').then(m => m.AuditWidget),
    },
  }),
);

export const EntityEnvironmentSelector = opaPlugin.provide(
  createComponentExtension({
    name: 'EnvironmentSelector',
    component: {
      lazy: () => import('./components/EnvironmentSelector/EnvironmentSelector').then(m => m.EnvironmentSelectorWidget),
    },
  }),
);

export const EntityAnnotationTypeTable = opaPlugin.provide(
  createComponentExtension({
    name: 'EntityAnnotationTypeTable',
    component: {
      lazy: () => import('./components/AnnotationTypeTable/AnnotationTypeTable').then(m => m.AnnotationWidget),
    },
  }),
);

export const EntityAppStateCard = opaPlugin.provide(
  createComponentExtension({
    name: 'AppStateCard',
    component: {
      lazy: () => import('./components/AppStateCard/AppStateCard').then(m => m.AppStateCard),
    },
  }),
);

export const EntityK8sAppStateCard = opaPlugin.provide(
  createComponentExtension({
    name: 'K8sAppStateCard',
    component: {
      lazy: () => import('./components/K8sAppStateCard/K8sAppStateCard').then(m => m.K8sAppStateCard),
    },
  }),
);

export const EntityAppStateCardCloudFormation = opaPlugin.provide(
  createComponentExtension({
    name: 'AppStateCardCloudFormation',
    component: {
      lazy: () => import('./components/AppStateCardCloudFormation/AppStateCardCloudFormation').then(m => m.AppStateCard),
    },
  }),
);

export const EntityGeneralInfoCard = opaPlugin.provide(
  createComponentExtension({
    name: 'GeneralInfoCard',
    component: {
      lazy: () => import('./components/GeneralInfoCard/GeneralInfoCard').then(m => m.GeneralInfoCard),
    },
  }),
);

export const EntityAppPromoCard = opaPlugin.provide(
  createComponentExtension({
    name: 'AppPromoCard',
    component: {
      lazy: () => import('./components/AppPromoCard/AppPromoCard').then(m => m.AppPromoWidget),
    },
  }),
);

export const EntityAppLinksCard = opaPlugin.provide(
  createComponentExtension({
    name: 'AppLinksCard',
    component: {
      lazy: () => import('./components/AppLinksCard/AppLinksCard').then(m => m.AppLinksCard),
    },
  }),
);

export const AppCatalogPage = opaPlugin.provide(
  createComponentExtension({
    name: 'AppCatalogPage',
    component: {
      lazy: () => import('./components/AppCatalogPage/AppCatalogPage').then(m => m.AppCatalogPage),
    },
  }),
);

export const EntityCloudwatchLogsTable = opaPlugin.provide(
  createComponentExtension({
    name: 'EntityCloudwatchLogsTable',
    component: {
      lazy: () => import('./components/CloudwatchLogsTable/CloudwatchLogsTable').then(m => m.CloudwatchLogsWidget),
    },
  }),
);

export const EntityInfrastructureInfoCard = opaPlugin.provide(
  createComponentExtension({
    name: 'InfrastructureInfoCard',
    component: {
      lazy: () => import('./components/InfrastructureCard/InfrastructureCard').then(m => m.InfrastructureCard),
    },
  }),
);


export const EntityProviderInfoCard = opaPlugin.provide(
  createComponentExtension({
    name: 'ProviderInfoCard',
    component: {
      lazy: () => import('./components/ProviderInfoCard/ProviderInfoCard').then(m => m.ProviderInfoCard),
    },
  }),
);

export const EntityEnvironmentInfoCard = opaPlugin.provide(
  createComponentExtension({
    name: 'EnvironmentInfoCard',
    component: {
      lazy: () => import('./components/EnvironmentInfoCard/EnvironmentInfoCard').then(m => m.EnvironmentInfoCard),
    },
  }),
);

export const EntityAppConfigCard = opaPlugin.provide(
  createComponentExtension({
    name: 'AppConfigCard',
    component: {
      lazy: () => import('./components/AppConfigCard/AppConfigCard').then(m => m.AppConfigCard),
    },
  }),
);

export const EntityDeleteAppCard = opaPlugin.provide(
  createComponentExtension({
    name: 'DeleteAppCard',
    component: {
      lazy: () => import('./components/DeleteComponentCard/DeleteComponentCard').then(m => m.DeleteComponentCard),
    },
  }),
);

export const EntityDeleteProviderCard = opaPlugin.provide(
  createComponentExtension({
    name: 'DeleteProviderCard',
    component: {
      lazy: () => import('./components/DeleteProviderCard/DeleteProviderCard').then(m => m.DeleteProviderCard),
    },
  }),
);

export const EntityDeleteEnvironmentCard = opaPlugin.provide(
  createComponentExtension({
    name: 'DeleteEnvironmentCard',
    component: {
      lazy: () => import('./components/DeleteEnvironmentCard/DeleteEnvironmentCard').then(m => m.DeleteEnvironmentCard),
    },
  }),
);

export const EntityResourceBindingCard = opaPlugin.provide(
  createComponentExtension({
    name: 'ResourceBindingCard',
    component: {
      lazy: () => import('./components/ResourceBindingCard/ResourceBinding').then(m => m.ResourceBindingCardWidget),
    },
  }),
);

export const EntityAwsEnvironmentProviderSelectorCard = opaPlugin.provide(
  createComponentExtension({
    name: 'AwsEnvironmentProviderSelectorCard',
    component: {
      lazy: () => import('./components/AwsEnvironmentProviderCard/AwsEnvironmentProviderCard').then(m => m.AwsEnvironmentProviderCardWidget),
    },
  }),
);

export const AwsAppPage = opaPlugin.provide(
  createComponentExtension({
    name: 'AwsAppPage',
    component: {
      lazy: () => import('./pages/AwsAppPage/AwsAppPage').then(m => m.AwsAppPage),
    },
  }),
);

export const AwsComponentPage = opaPlugin.provide(
  createComponentExtension({
    name: 'AwsComponentPage',
    component: {
      lazy: () => import('./pages/AwsComponentPage/AwsComponentPage').then(m => m.AwsComponentPage),
    },
  }),
);

export const AwsEnvironmentPage = opaPlugin.provide(
  createComponentExtension({
    name: 'AwsEnvironmentPage',
    component: {
      lazy: () => import('./pages/AwsEnvironmentPage/AwsEnvironmentPage').then(m => m.AwsEnvironmentPage),
    },
  }),
);

export const AwsEnvironmentProviderPage = opaPlugin.provide(
  createComponentExtension({
    name: 'AwsEnvironmentProviderPage',
    component: {
      lazy: () => import('./pages/AwsEnvironmentProviderPage/AwsEnvironmentProviderPage').then(m => m.AwsEnvironmentProviderPage),
    },
  }),
);
