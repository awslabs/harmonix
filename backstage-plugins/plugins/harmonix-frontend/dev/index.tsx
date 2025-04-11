import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { AppCatalogPage, harmonixFrontendPlugin } from '../src/plugin';
import {
  CatalogIndexPage,
} from '@backstage/plugin-catalog';

createDevApp()
  .registerPlugin(harmonixFrontendPlugin)
  // .addPage({
  //   element: <HarmonixHomePage />,
  //   title: 'Harmonix Home',
  //   path: '/'
  // })
  // .addPage({
  //   element: <HarmonixHomePage />,
  //   title: 'Harmonix Home',
  //   path: '/home'
  // })
  .addPage({
    element: <CatalogIndexPage />,
    title: 'Root Page',
    path: '/aws-apps-search-page',
  }).addPage({
    element: <AppCatalogPage kind="awsenvironment" />,
    title: 'AWS Environments',
    path: '/aws-apps-search-page/environments',
  }).addPage({
    element: <AppCatalogPage kind="awsenvironmentprovider" />,
    title: 'AWS Environment Providers',
    path: '/aws-apps-search-page/providers',
  }).addPage({
    element: <AppCatalogPage kind="component" />,
    title: 'AWS Apps',
    path: '/aws-apps-search-page/apps',
  }).addPage({
    element: <AppCatalogPage kind="resource" />,
    title: 'AWS Resources',
    path: '/aws-apps-search-page/resources',
  })
  .render();


