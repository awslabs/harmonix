// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Grid } from '@material-ui/core';
import { EntityAboutCard } from '@backstage/plugin-catalog';
import { EntityGeneralInfoCard, EntityAppStateCard, EntityInfrastructureInfoCard, EntityAppConfigCard, EntityAppLinksCard } from '../../plugin';
import {
  EntityCatalogGraphCard
} from '@backstage/plugin-catalog-graph';

interface AwsECSAppPageProps {

}

/** @public */
export function AwsECSAppPage(_props: AwsECSAppPageProps) {
  // Add plugin UI cards and page
  const awsEcsAppViewContent = (
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
      <Grid item md={6} xs={12}>
        <EntityAppStateCard />
      </Grid>
      <Grid item md={6} xs={12}>
        <EntityAppConfigCard></EntityAppConfigCard>
      </Grid>
      <Grid item md={12} xs={12}>
        <EntityInfrastructureInfoCard />
      </Grid>
    </Grid>
  );


  return (
    <>
      {awsEcsAppViewContent}
    </>
  );
}
