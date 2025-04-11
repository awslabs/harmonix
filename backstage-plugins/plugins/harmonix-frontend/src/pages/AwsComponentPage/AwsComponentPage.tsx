// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { AsyncAwsAppProvider, useAwsComponentFromContext } from '../../hooks/useAwsApp'
import { AwsAppPage } from '../AwsAppPage/AwsAppPage'
import { AwsResourcePage } from '../AwsResourcePage/AwsResourcePage'
import { AwsPendingPage } from '../AwsPendingPage/AwsPendingPage'
import { EntityEnvironmentSelector } from '../../plugin';
import {
  useEntity,
} from '@backstage/plugin-catalog-react';

export interface AwsComponentPageProps {
  componentType: string;
}

/** @public */
export function AwsComponentPage({ componentType }: AwsComponentPageProps) {
  const { entity } = useEntity();

  const isApp = componentType === "aws-app";
  const isResource = componentType === "aws-resource";
  const isComponentReady = entity.metadata["appData"] !== undefined;

  return (
    <AsyncAwsAppProvider {...useAwsComponentFromContext()}>
      {
        //Before loading page - check if context exist - or AWS provisioning has not yet complete. 
        //if it's not ready - load an alternate pending page which only has general info and repo information
        isComponentReady ? (
          isApp ? (
            <AwsAppPage>
              <EntityEnvironmentSelector />
            </AwsAppPage>
          ) : isResource ? (
            <AwsResourcePage>
              <EntityEnvironmentSelector />
            </AwsResourcePage>
          ) :
            <div>No AWS matching page to render: {componentType}</div>
        ) :
          (
            <AwsPendingPage />
          )
      }
    </AsyncAwsAppProvider>
  )
}
