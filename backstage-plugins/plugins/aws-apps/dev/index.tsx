import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { opaPlugin, AppCatalogPage } from '../src/plugin';

createDevApp()
  .registerPlugin(opaPlugin)
  .addPage({
    element: <AppCatalogPage kind={'all'} />,
    title: 'Root Page',
    path: '/aws-apps',
  })
  .render();
