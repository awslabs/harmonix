// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Content, Page } from '@backstage/core-components';
import { Grid } from '@material-ui/core';
import React from 'react';
import {
  EntityGitlabIssuesTable,
  EntityGitlabLanguageCard,
  EntityGitlabReleasesCard,
  EntityGitlabPeopleCard,
  EntityGitlabMergeRequestsTable,
  EntityGitlabMergeRequestStatsCard,
  EntityGitlabPipelinesTable,
} from '@immobiliarelabs/backstage-plugin-gitlab';

const Gitlab = () => (
  <Page themeId="tool">
        <Content>
            <Grid container spacing={6} direction="row" alignItems="stretch">
                <Grid item md={12}>
                    <EntityGitlabPipelinesTable />
                </Grid>
                <Grid item md={12}>
                    <EntityGitlabMergeRequestsTable />
                </Grid>
                <Grid item md={12}>
                    <EntityGitlabIssuesTable />
                </Grid>
                <Grid item sm={12} md={3} lg={3}>
                    <EntityGitlabPeopleCard />
                </Grid>
                <Grid item sm={12} md={3} lg={3}>
                    <EntityGitlabLanguageCard />
                </Grid>
                <Grid item sm={12} md={3} lg={3}>
                    <EntityGitlabMergeRequestStatsCard />
                </Grid>
                <Grid item sm={12} md={3} lg={3}>
                    <EntityGitlabReleasesCard />
                </Grid>
            </Grid>
        </Content>
    </Page>
);

export const GitLabWidget = () => {
  return <Gitlab />
};
