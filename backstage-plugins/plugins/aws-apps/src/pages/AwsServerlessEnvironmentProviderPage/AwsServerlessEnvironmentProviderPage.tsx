// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Entity } from '@backstage/catalog-model';
import { EntityAboutCard, EntityLayout, EntityLinksCard } from '@backstage/plugin-catalog';
import { EntityCatalogGraphCard } from '@backstage/plugin-catalog-graph';
import { isGithubActionsAvailable } from '@backstage/plugin-github-actions';
import { EntityTechdocsContent } from '@backstage/plugin-techdocs';
import { ReportIssue } from '@backstage/plugin-techdocs-module-addons-contrib';
import { TechDocsAddons } from '@backstage/plugin-techdocs-react';
import { isGitlabAvailable } from '@immobiliarelabs/backstage-plugin-gitlab';
import { Grid } from '@material-ui/core';
import React, { ReactNode } from 'react';
import { CICDContent } from '../../components/CICDContent/CICDContent';
import { EntityDeleteProviderCard, EntityProviderInfoCard } from '../../plugin';

export interface AwsEnvironmentProviderPageProps {
  children?: ReactNode;
}

const isCicdApplicable = (entity: Entity) => {
  return isGitlabAvailable(entity) || isGithubActionsAvailable(entity);
};

/** @public */
export function AwsServerlessEnvironmentProviderPage(/* {children}: AwsEnvironmentProviderPageProps */) {
  return (
    <EntityLayout>
      <EntityLayout.Route path="/" title="Overview">
        <Grid container spacing={3} alignItems="stretch">
          <Grid item md={6}>
            <EntityAboutCard variant="gridItem" />
          </Grid>
          <Grid item md={6} xs={12}>
            <EntityCatalogGraphCard variant="gridItem" height={400} showArrowHeads />
          </Grid>
          <Grid item md={6}>
            <EntityProviderInfoCard/>
          </Grid>
          <Grid item md={6} xs={12}>
            <EntityLinksCard />
          </Grid>
        </Grid>
      </EntityLayout.Route>
      <EntityLayout.Route path="/ci-cd" title="CI/CD" if={isCicdApplicable}>
        <CICDContent />
      </EntityLayout.Route>
      <EntityLayout.Route path="/docs" title="Docs">
        <EntityTechdocsContent>
          <TechDocsAddons>
            <ReportIssue />
          </TechDocsAddons>
        </EntityTechdocsContent>
      </EntityLayout.Route>
      <EntityLayout.Route path="/management" title="Management">
         <Grid item md={6} xs={12}>
            <EntityDeleteProviderCard />
          </Grid>
      </EntityLayout.Route>
    </EntityLayout>
  );
}
