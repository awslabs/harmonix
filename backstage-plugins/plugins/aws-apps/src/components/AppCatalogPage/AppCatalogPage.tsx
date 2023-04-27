// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Content, ContentHeader, CreateButton, PageWithHeader, SupportButton } from '@backstage/core-components';
import {
  CatalogFilterLayout,
  EntityListProvider,
  EntityOwnerPicker,
  EntityTagPicker,
  UserListPicker,
  EntityKindPicker,
} from '@backstage/plugin-catalog-react';
import React from 'react';
import { CatalogTable, DefaultCatalogPageProps } from '@backstage/plugin-catalog';
import { AdvancedEntityTypePicker } from './AdvancedEntityTypePicker';

/**
 * Props for root catalog pages.
 *
 * @public
 */
export interface AppCatalogPageProps extends DefaultCatalogPageProps {
  initialType?: string;
}

export function AppCatalogPage(props: AppCatalogPageProps) {
  const {
    columns,
    actions,
    initiallySelectedFilter = 'owned',
    initialKind = 'component',
    initialType = 'aws-app',
    tableOptions = {},
    emptyContent,
  } = props;

  const allowedTypesComponent = ['aws-app'];
  const allowedTypesResource = ['aws-rds', 'aws-s3'];
  const allowedTypesEnvironment = ['environment-provider', 'environment'];
  const allowedKinds = ['Component', 'Resource', 'AWSEnvironment', 'AWSEnvironmentProvider'];

  
  return (
    <PageWithHeader title={'AWS Software Catalog'} themeId="home">
      <Content>
        <ContentHeader title="">
          <CreateButton
            title={'Create AWS App'}
            to={'/create?filters%5Bkind%5D=template&filters%5Buser%5D=all&filters%5Btags%5D=aws'}
          />
          <SupportButton>All your software catalog entities</SupportButton>
        </ContentHeader>
        <EntityListProvider>
          <CatalogFilterLayout>
            <CatalogFilterLayout.Filters>
              <EntityKindPicker initialFilter={initialKind} allowedKinds={allowedKinds} />
              <AdvancedEntityTypePicker
                initialFilter={initialType}
                allowedTypes={[...allowedTypesComponent, ...allowedTypesEnvironment, ...allowedTypesResource]}
              />
              <UserListPicker initialFilter={initiallySelectedFilter} />
              <EntityOwnerPicker />
              <EntityTagPicker />
              {/* <EntityAutocompletePicker
                label="Tags"
                name="tags"
                path="metadata.tags"
                Filter={EntityTagFilter}
                showCounts={true}
                InputProps={{ className: classes.input }}
              /> */}
            </CatalogFilterLayout.Filters>
            <CatalogFilterLayout.Content>
              <CatalogTable
                columns={columns}
                actions={actions}
                tableOptions={tableOptions}
                emptyContent={emptyContent}
              />
            </CatalogFilterLayout.Content>
          </CatalogFilterLayout>
        </EntityListProvider>
      </Content>
    </PageWithHeader>
  );
}
