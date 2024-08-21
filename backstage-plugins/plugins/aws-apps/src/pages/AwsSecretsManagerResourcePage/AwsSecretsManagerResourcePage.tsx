// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Grid } from '@material-ui/core';
import React, { ReactNode } from 'react';
import { EntityAboutCard, EntityLinksCard } from '@backstage/plugin-catalog';
import {
  EntityCatalogGraphCard
} from '@backstage/plugin-catalog-graph';
import { EntityInfrastructureInfoCard } from '../../plugin';

interface AwsSecretsManagerResourcePageProps {
  children?: ReactNode
}

/** @public */
export function AwsSecretsManagerResourcePage(_props: AwsSecretsManagerResourcePageProps) {
  const rdsContent = (
    <Grid container spacing={3} alignItems="stretch">
      <Grid item md={6}>
        <EntityAboutCard variant="gridItem" />
      </Grid>
      <Grid item md={6} xs={12}>
        <EntityCatalogGraphCard variant="gridItem" height={400} showArrowHeads />
      </Grid>
      <Grid item md={6} xs={12}>
        <EntityLinksCard />
      </Grid>
      <Grid item md={12} xs={12}>
        <EntityInfrastructureInfoCard />
      </Grid>
    </Grid>
  );
  return (
    <>
      {rdsContent}
    </>
  );
}
