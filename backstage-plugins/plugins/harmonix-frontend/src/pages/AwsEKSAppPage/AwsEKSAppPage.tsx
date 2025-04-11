import React from 'react';
import { Grid } from '@material-ui/core';
import { EntityAboutCard } from '@backstage/plugin-catalog';
import { EntityGeneralInfoCard, EntityAppLinksCard, EntityInfrastructureInfoCard, EntityK8sAppStateCard } from '../../plugin';
import {
  EntityCatalogGraphCard
} from '@backstage/plugin-catalog-graph';

interface AwsEKSAppPageProps {

}

/** @public */
export function AwsEKSAppPage(_props: AwsEKSAppPageProps) {
  const awsEKSAppViewContent = (
    <Grid container spacing={3} alignItems="stretch">
      <Grid item md={6}>
        <EntityAboutCard variant="gridItem" />
      </Grid>
      <Grid item md={6} xs={12}>
        <EntityCatalogGraphCard variant="gridItem" height={400} showArrowHeads />
      </Grid>
      <Grid item md={6} xs={12}>
        <EntityAppLinksCard />
      </Grid>
      <Grid item md={6} xs={12}>
        <EntityGeneralInfoCard appPending={false} />
      </Grid>
      <Grid item md={12} xs={12}>
        <EntityK8sAppStateCard />
      </Grid>
      <Grid item md={12} xs={12}>
        <EntityInfrastructureInfoCard />
      </Grid>
    </Grid>
  );

  return (
    <>
      {awsEKSAppViewContent}
    </>
  );
}
