// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { createDevApp } from '@backstage/dev-utils';
import { bawsPlugin, EntityGeneralInfoCard, EntityAppStateCard, EntityInfrastructureInfoCard } from '../src/plugin';
import { EntityProvider } from '@backstage/plugin-catalog-react';
import { TestApiProvider } from '@backstage/test-utils';
import React from 'react';
import { mockEntity, MockEcsService } from '../src/mocks';
import { bawsApiRef } from '../src/api';
createDevApp()
  .addPage({
    path: '/fixture-baws-service',
    title: 'App Card',
    element: (
      // <TestApiProvider apis={[[bawsApiRef]]}>
      <EntityProvider entity={mockEntity}>{/* <EntityBAWSAppCard /> */}</EntityProvider>
      // </TestApiProvider>
    ),
  })
  .addPage({
    path: '/fixture-baws-entity',
    title: 'Entity Page',
    element: (
      // <TestApiProvider apis={[[bawsApiRef]]}>
      <EntityProvider entity={mockEntity}>{/* <EntityBAWSAppCard /> */}</EntityProvider>
      // </TestApiProvider>
    ),
  })
  .addPage({
    path: '/test',
    title: 'Mega Service',
    element: (
      <TestApiProvider apis={[[bawsApiRef, new MockEcsService()]]}>
        <EntityProvider entity={mockEntity}>
          <EntityAppStateCard />
        </EntityProvider>
      </TestApiProvider>
    ),
  })
  .addPage({
    path: '/testgeneralinfo',
    title: 'General Info',
    element: (
      <TestApiProvider apis={[[bawsApiRef, new MockEcsService()]]}>
        <EntityProvider entity={mockEntity}>
          <EntityGeneralInfoCard />
        </EntityProvider>
      </TestApiProvider>
    ),
  })
  .addPage({
    path: '/testinfrainfo',
    title: 'Infra Info',
    element: (
      <TestApiProvider apis={[[bawsApiRef, new MockEcsService()]]}>
        <EntityProvider entity={mockEntity}>
          <EntityInfrastructureInfoCard />
        </EntityProvider>
      </TestApiProvider>
    ),
  })
  .registerPlugin(bawsPlugin)
  .render();
