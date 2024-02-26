// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { GenericAWSEnvironment, readOpaAppAuditPermission } from '@aws/plugin-aws-apps-common-for-backstage';
import { Entity } from '@backstage/catalog-model';
import { EmptyState } from '@backstage/core-components';
import { EntityLayout, EntitySwitch } from '@backstage/plugin-catalog';
import { isGithubActionsAvailable } from '@backstage/plugin-github-actions';
import { RequirePermission, usePermission } from '@backstage/plugin-permission-react';
import { isGitlabAvailable } from '@immobiliarelabs/backstage-plugin-gitlab';
import { Grid, LinearProgress } from '@material-ui/core';
import React, { ReactNode } from 'react';
import { useAsyncAwsApp } from '../../hooks/useAwsApp';
import {
  EntityAppPromoCard,
  EntityAuditTable,
  EntityCloudwatchLogsTable,
  EntityDeleteAppCard,
  EntityResourceBindingCard,
} from '../../plugin';
import { AwsECSAppPage } from '../AwsECSAppPage/AwsECSAppPage';
import { AwsServerlessAppPage } from '../AwsServerlessAppPage/AwsServerlessAppPage';
import { CICDContent } from '../../components/CICDContent/CICDContent';
import { AwsEKSAppPage } from '../AwsEKSAppPage/AwsEKSAppPage';

interface AwsAppPageProps {
  children: ReactNode;
}

const isCicdApplicable = (entity: Entity) => {
  return isGitlabAvailable(entity) || isGithubActionsAvailable(entity);
};

export function isAppType(appType: string, env: GenericAWSEnvironment): (entity: Entity) => boolean {
  return (/*entity: Entity*/): boolean => {
    // ecs or eks or serverless
    return env.providerData.providerType === appType;
  };
}

export const isLogsAvailable = (_entity: Entity): boolean => {
  return true;
};

/** @public */
export function AwsAppPage(_props: AwsAppPageProps) {
  const awsAppLoadingStatus = useAsyncAwsApp();

  const { loading: loadingPermission, allowed: canReadAudit } = usePermission({
    permission: readOpaAppAuditPermission,
  });

  const awsAppLogsContent = (
    <Grid container spacing={3} alignItems="stretch">
      <Grid item md={12} xs={12}>
        <EntityCloudwatchLogsTable />
      </Grid>
    </Grid>
  );

  const auditContent = (
    <Grid container spacing={1} alignItems="stretch">
      <Grid item md={12} xs={12}>
        <EntityAuditTable />
      </Grid>
    </Grid>
  );

  const managementContent = (
    <Grid container spacing={1} alignItems="stretch">
      <Grid item md={6} xs={6}>
        <EntityAppPromoCard />
      </Grid>
      <Grid item md={6} xs={6}>
        <EntityDeleteAppCard />
      </Grid>
      <Grid item md={12} xs={12}>
        <EntityResourceBindingCard />
      </Grid>
    </Grid>
  );

  const AwsECSAppEntityPage = (
    <>
      {_props.children}
      <EntityLayout>
        <EntityLayout.Route path="/" title="Overview">
          <AwsECSAppPage />
        </EntityLayout.Route>
        <EntityLayout.Route path="/ci-cd" title="CI/CD" if={isCicdApplicable}>
          <CICDContent />
        </EntityLayout.Route>
        <EntityLayout.Route path="/logs" title="App Logs" if={isLogsAvailable}>
          {awsAppLogsContent}
        </EntityLayout.Route>
        <EntityLayout.Route path="/management" title="Management">
          {managementContent}
        </EntityLayout.Route>
        {!loadingPermission && canReadAudit && (
          <EntityLayout.Route path="/audit" title="Audit">
            <RequirePermission permission={readOpaAppAuditPermission} errorPage={<></>}>
              {auditContent}
            </RequirePermission>
          </EntityLayout.Route>
        )}
      </EntityLayout>
    </>
  );

  const AwsEKSAppEntityPage = (
    <>
      {_props.children}
      <EntityLayout>
        <EntityLayout.Route path="/" title="Overview">
          <AwsEKSAppPage />
        </EntityLayout.Route>
        <EntityLayout.Route path="/ci-cd" title="CI/CD" if={isCicdApplicable}>
          <CICDContent />
        </EntityLayout.Route>
        <EntityLayout.Route path="/logs" title="App Logs" if={isLogsAvailable}>
          {awsAppLogsContent}
        </EntityLayout.Route>
        <EntityLayout.Route path="/management" title="Management">
          {managementContent}
        </EntityLayout.Route>
        {!loadingPermission && canReadAudit && (
          <EntityLayout.Route path="/audit" title="Audit">
            <RequirePermission permission={readOpaAppAuditPermission} errorPage={<></>}>
              {auditContent}
            </RequirePermission>
          </EntityLayout.Route>
        )}
      </EntityLayout>
    </>
  );

  const AwsServerlessAppEntityPage = (
    <>
      {_props.children}
      <EntityLayout>
        <EntityLayout.Route path="/" title="Overview">
          <AwsServerlessAppPage />
        </EntityLayout.Route>
        <EntityLayout.Route path="/ci-cd" title="CI/CD" if={isCicdApplicable}>
          <CICDContent />
        </EntityLayout.Route>
        <EntityLayout.Route path="/logs" title="App Logs" if={isLogsAvailable}>
          {awsAppLogsContent}
        </EntityLayout.Route>
        <EntityLayout.Route path="/management" title="Management">
          {managementContent}
        </EntityLayout.Route>
        {!loadingPermission && canReadAudit && (
          <EntityLayout.Route path="/audit" title="Audit">
            <RequirePermission permission={readOpaAppAuditPermission} errorPage={<></>}>
              {auditContent}
            </RequirePermission>
          </EntityLayout.Route>
        )}
      </EntityLayout>
    </>
  );

  if (awsAppLoadingStatus.loading) {
    return <LinearProgress />;
  } else if (awsAppLoadingStatus.component) {
    const env = awsAppLoadingStatus.component.currentEnvironment;
    return (
      <EntitySwitch>
        <EntitySwitch.Case if={isAppType('ecs', env)}>{AwsECSAppEntityPage}</EntitySwitch.Case>
        <EntitySwitch.Case if={isAppType('eks', env)}>{AwsEKSAppEntityPage}</EntitySwitch.Case>
        <EntitySwitch.Case if={isAppType('serverless', env)}>{AwsServerlessAppEntityPage}</EntitySwitch.Case>
        <EntitySwitch.Case if={isAppType('gen-ai-serverless', env)}>{AwsServerlessAppEntityPage}</EntitySwitch.Case>
        <EntitySwitch.Case>
          <h1>Application Type "{env.providerData.providerType}" Is Not Supported At This Time</h1>
        </EntitySwitch.Case>
      </EntitySwitch>
    );
  } else {
    if (awsAppLoadingStatus.error) {
      console.log(awsAppLoadingStatus.error);
    }

    return (
      <EmptyState
        missing="data"
        title="Failed to load environment entity data"
        description="An error occurred when trying to load entity environment data. See the environment entity yaml file definitions to troubleshoot."
      />
    );
  }
}
