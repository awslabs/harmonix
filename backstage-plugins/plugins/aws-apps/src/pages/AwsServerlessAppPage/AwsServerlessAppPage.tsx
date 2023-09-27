// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { EntityAboutCard } from '@backstage/plugin-catalog';
import { EntityAppLinksCard, EntityAppStateCardCloudFormation, EntityGeneralInfoCard, EntityInfrastructureInfoCard } from '../../plugin';
import { Grid } from '@material-ui/core';
import {
  EntityCatalogGraphCard
} from '@backstage/plugin-catalog-graph';

interface AwsServerlessAppPageProps {

}

/** @public */
export function AwsServerlessAppPage(_props: AwsServerlessAppPageProps) {

  const awsServerlessRestApiAppViewContent = (
    <Grid container spacing={3} alignItems="stretch">
      <Grid item md={6}>
        <EntityAboutCard variant="gridItem" />
      </Grid>
      <Grid item md={6} xs={12}>
        <EntityCatalogGraphCard variant="gridItem" height={400} />
      </Grid>
      <Grid item md={6} xs={12}>
        <EntityAppLinksCard />
      </Grid>
      <Grid item md={6} xs={12}>
        <EntityGeneralInfoCard appPending={false} />
      </Grid>
      <Grid item md={12} xs={12}>
        <EntityAppStateCardCloudFormation />
      </Grid>
      <Grid item md={12} xs={12}>
        <EntityInfrastructureInfoCard />
      </Grid>
    </Grid>
  );

  return (
    <>
      {awsServerlessRestApiAppViewContent}
    </>
  );
}
