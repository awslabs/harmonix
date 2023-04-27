// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  createPlugin,
  createApiFactory,
  configApiRef,
  identityApiRef,
  createComponentExtension,
  discoveryApiRef,
} from '@backstage/core-plugin-api';
import { Entity } from '@backstage/catalog-model';
import { rootRouteRef } from './routes';
import { BawsApiClient, bawsApiRef } from './api';
import { GitlabCIApiRef, GitlabCIClient } from '@immobiliarelabs/backstage-plugin-gitlab';

export const isBAWSAppAvailable = (entity: Entity) => entity?.spec?.type === 'aws-app';
export const isAnnotationsAvailable = (entity: Entity) => entity?.metadata?.annotations;
export const isLabelsAvailable = (entity: Entity) => entity?.metadata?.labels;

export const bawsPlugin = createPlugin({
  id: 'aws-apps',
  apis: [
    createApiFactory({
      api: GitlabCIApiRef,
      deps: {
        configApi: configApiRef,
        discoveryApi: discoveryApiRef,
        identityApi: identityApiRef,
      },
      factory: ({ configApi, discoveryApi, identityApi }) =>
        GitlabCIClient.setupAPI({
          discoveryApi,
          identityApi,
          codeOwnersPath: configApi.getOptionalString('gitlab.defaultCodeOwnersPath'),
        }),
    }),
    createApiFactory({
      api: bawsApiRef,
      deps: { configApi: configApiRef, identityApi: identityApiRef },
      factory: ({ configApi, identityApi }) => new BawsApiClient({ configApi, identityApi }),
    }),
  ],
  routes: {
    root: rootRouteRef,
  },
});

export const EntityLabelTable = bawsPlugin.provide(
  createComponentExtension({
    name: 'EntityLabelTable',
    component: {
      lazy: () => import('./components/LabelTable/LabelTable').then(m => m.LabelWidget),
    },
  }),
);

export const EntityAuditTable = bawsPlugin.provide(
  createComponentExtension({
    name: 'EntityAuditTable',
    component: {
      lazy: () => import('./components/AuditTable/AuditTable').then(m => m.AuditWidget),
    },
  }),
);

export const EntityAnnotationTypeTable = bawsPlugin.provide(
  createComponentExtension({
    name: 'EntityAnnotationTypeTable',
    component: {
      lazy: () => import('./components/AnnotationTypeTable/AnnotationTypeTable').then(m => m.AnnotationWidget),
    },
  }),
);

export const EntityCustomGitlabContent = bawsPlugin.provide(
  createComponentExtension({
    name: 'EntityCustomGitlabContent',
    component: {
      lazy: () => import('./components/GitLab/GitLab').then(m => m.GitLabWidget),
    },
  }),
);

export const EntityAppStateCard = bawsPlugin.provide(
  createComponentExtension({
    name: 'AppStateCard',
    component: {
      lazy: () => import('./components/AppStateCard/AppStateCard').then(m => m.AppStateCard),
    },
  }),
);

export const EntityAppStateCardCloudFormation = bawsPlugin.provide(
  createComponentExtension({
    name: 'AppStateCardCloudFormation',
    component: {
      lazy: () => import('./components/AppStateCardCloudFormation/AppStateCardCloudFormation').then(m => m.AppStateCard),
    },
  }),
);

export const EntityGeneralInfoCard = bawsPlugin.provide(
  createComponentExtension({
    name: 'GeneralInfoCard',
    component: {
      lazy: () => import('./components/GeneralInfoCard/GeneralInfoCard').then(m => m.GeneralInfoCard),
    },
  }),
);

export const AppCatalogPage = bawsPlugin.provide(
  createComponentExtension({
    name: 'AppCatalogPage',
    component: {
      lazy: () => import('./components/AppCatalogPage/AppCatalogPage').then(m => m.AppCatalogPage),
    },
  }),
);

export const EntityCloudwatchLogsTable = bawsPlugin.provide(
  createComponentExtension({
    name: 'EntityCloudwatchLogsTable',
    component: {
      lazy: () => import('./components/CloudwatchLogsTable/CloudwatchLogsTable').then(m => m.CloudwatchLogsWidget),
    },
  }),
);

export const EntityInfrastructureInfoCard = bawsPlugin.provide(
  createComponentExtension({
    name: 'InfrastructureInfoCard',
    component: {
      lazy: () => import('./components/InfrastructureCard/InfrastructureCard').then(m => m.InfrastructureCard),
    },
  }),
);
export const EntityAppConfigCard = bawsPlugin.provide(
  createComponentExtension({
    name: 'AppConfigCard',
    component: {
      lazy: () => import('./components/AppConfigCard/AppConfigCard').then(m => m.AppConfigCard),
    },
  }),
);

export const AwsAppPage = bawsPlugin.provide(
  createComponentExtension({
    name: 'AwsAppPage',
    component: {
      lazy: () => import('./components/AwsAppPage/AwsAppPage').then(m => m.AwsAppPage),
    },
  }),
);
