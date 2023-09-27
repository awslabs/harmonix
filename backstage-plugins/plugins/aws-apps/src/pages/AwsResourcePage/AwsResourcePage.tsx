// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Entity } from '@backstage/catalog-model';
import { EntityLayout, EntitySwitch } from '@backstage/plugin-catalog';
import { isGithubActionsAvailable } from '@backstage/plugin-github-actions';
import { isGitlabAvailable } from '@immobiliarelabs/backstage-plugin-gitlab';
import { Grid } from '@material-ui/core';
import React, { ReactNode } from 'react';
import { CICDContent } from '../../components/CICDContent/CICDContent';
import { EntityDeleteAppCard } from '../../plugin';
import { AwsRDSResourcePage } from '../AwsRDSResourcePage/AwsRDSResourcePage';

interface AwsResourcePageProps {
  children: ReactNode;
}

export function isResourceType(resourceType: string): (entity: Entity) => boolean {
  return (entity: Entity): boolean => {
    let subType = 'N/A';
    if (entity?.metadata?.['resource-type']) subType = entity?.metadata?.['resource-type'].toString();
    return subType == resourceType;
  };
}

const isCicdApplicable = (entity: Entity) => {
  return isGitlabAvailable(entity) || isGithubActionsAvailable(entity);
};

/** @public */
export function AwsResourcePage(_props: AwsResourcePageProps) {
  const managementContent = (
    <Grid container spacing={1} alignItems="stretch">
      <Grid item md={12} xs={12}>
        <EntityDeleteAppCard />
      </Grid>
    </Grid>
  );

  const AwsRDSResourceEntityPage = (
    <>
      {_props.children}
      <EntityLayout>
        <EntityLayout.Route path="/" title="Overview">
          <AwsRDSResourcePage></AwsRDSResourcePage>
        </EntityLayout.Route>
        <EntityLayout.Route path="/ci-cd" title="CI/CD" if={isCicdApplicable}>
          <CICDContent />
        </EntityLayout.Route>
        <EntityLayout.Route path="/management" title="Management">
          {managementContent}
        </EntityLayout.Route>
      </EntityLayout>
    </>
  );

  return (
    <EntitySwitch>
      <EntitySwitch.Case if={isResourceType('aws-rds')}>{AwsRDSResourceEntityPage}</EntitySwitch.Case>
      {/* <EntitySwitch.Case if={isResourceType('aws-s3')}>
        {AwsS3EntityPage}
      </EntitySwitch.Case>
      <EntitySwitch.Case if={isResourceType('aws-sqs')}>
        {AwsSQSEntityPage}
      </EntitySwitch.Case> */}
    </EntitySwitch>
  );
}
