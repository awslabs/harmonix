// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { ReactNode } from 'react';
import { EntitySwitch } from '@backstage/plugin-catalog';
import { AwsECSEnvironmentProviderPage } from '../AwsECSEnvironmentProviderPage/AwsECSEnvironmentProviderPage';
import { AwsServerlessEnvironmentProviderPage } from '../AwsServerlessEnvironmentProviderPage/AwsServerlessEnvironmentProviderPage';
import { useEntity } from '@backstage/plugin-catalog-react';
import { Entity } from '@backstage/catalog-model';
import { ProviderType } from '../../helpers/constants';

export interface AwsEnvironmentProviderPageProps {
  children?: ReactNode
}

export function isProviderType(providerType: string, entity: Entity): (entity: Entity) => boolean {
  return (): boolean => {
    return entity.metadata["env-type"]?.toString().toLowerCase() === providerType;
  };
};

/** @public */
export function AwsEnvironmentProviderPage(/* {children}: AwsEnvironmentProviderPageProps */) {
  const { entity } = useEntity();

  return (
    <EntitySwitch>
      <EntitySwitch.Case if={isProviderType(ProviderType.ECS, entity)}>
        <AwsECSEnvironmentProviderPage />
      </EntitySwitch.Case>
      <EntitySwitch.Case if={isProviderType(ProviderType.SERVERLESS, entity)}>
        <AwsServerlessEnvironmentProviderPage />
      </EntitySwitch.Case>
      <EntitySwitch.Case>
        <h1>Environment Provider Type "{entity.metadata["env-type"]}" Is Not Supported At This Time</h1>
      </EntitySwitch.Case>
    </EntitySwitch>
  );
}
