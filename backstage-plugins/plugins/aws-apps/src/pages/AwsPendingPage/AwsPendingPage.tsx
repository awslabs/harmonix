// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Entity } from '@backstage/catalog-model';
import { EntityAboutCard, EntityLayout, EntityLinksCard } from '@backstage/plugin-catalog';
import { EntityCatalogGraphCard } from '@backstage/plugin-catalog-graph';
import { useEntity } from '@backstage/plugin-catalog-react';
import { isGithubActionsAvailable } from '@backstage/plugin-github-actions';
import { isGitlabAvailable } from '@immobiliarelabs/backstage-plugin-gitlab';
import { Grid } from '@material-ui/core';
import React from 'react';
import { CICDContent } from '../../components/CICDContent/CICDContent';
import { EntityGeneralInfoCard } from '../../plugin';

interface AwsPendingPageProps {}

const isCicdApplicable = (entity: Entity) => {
  return isGitlabAvailable(entity) || isGithubActionsAvailable(entity);
};

/** @public */
export function AwsPendingPage(_props: AwsPendingPageProps) {
  const { entity } = useEntity();
  let isResource: boolean = false;
  if (entity.spec) {
    isResource = entity.spec.type === 'aws-resource';
  }

  const AwsPendingEntityPage = (
    <>
      <EntityLayout>
        <EntityLayout.Route path="/" title="Overview">
          <Grid container spacing={3} alignItems="stretch">
            <Grid item md={6}>
              <EntityAboutCard variant="gridItem" />
            </Grid>
            <Grid item md={6} xs={12}>
              <EntityCatalogGraphCard variant="gridItem" height={400} />
            </Grid>
            <Grid item md={6} xs={12}>
              <EntityLinksCard />
            </Grid>
            <Grid item md={6} xs={12}>
              {!isResource ? <EntityGeneralInfoCard appPending /> : <></>}
            </Grid>
          </Grid>
        </EntityLayout.Route>
        <EntityLayout.Route path="/ci-cd" title="CI/CD" if={isCicdApplicable}>
          <CICDContent />
        </EntityLayout.Route>
      </EntityLayout>
    </>
  );

  return AwsPendingEntityPage;
}
