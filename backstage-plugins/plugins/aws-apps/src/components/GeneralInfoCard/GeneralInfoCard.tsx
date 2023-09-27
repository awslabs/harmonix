// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { CodeSnippet, InfoCard, EmptyState } from '@backstage/core-components';
import { LinearProgress } from '@material-ui/core';
import { useApi } from '@backstage/core-plugin-api';
import { OPAApi, opaApiRef } from '../../api';
import { Typography, CardContent, IconButton, Grid } from '@mui/material';
import { GetSecretValueCommandOutput } from '@aws-sdk/client-secrets-manager';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { SecretStringComponent } from '../common';
import { useAsyncAwsApp } from '../../hooks/useAwsApp';
import { AWSECSAppDeploymentEnvironment } from '@aws/plugin-aws-apps-common-for-backstage';
import { useEntity } from '@backstage/plugin-catalog-react';

const OpaAppGeneralInfo = ({
  input: { gitHostUrl, gitApp, repoSecretArn, api, appPending }
}: { input: { account: string, region: string, gitHostUrl: string, gitApp: string, repoSecretArn: string, api: OPAApi, appPending: boolean } }) => {

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ isError: boolean; errorMsg: string | null }>({ isError: false, errorMsg: null });
  const secretOutput: GetSecretValueCommandOutput = {
    ARN: undefined,
    CreatedDate: undefined,
    Name: undefined,
    SecretString: undefined,
    $metadata: {},
    VersionId: undefined,
    VersionStages: undefined,
  };
  const [secretData, setSecretData] = useState(secretOutput);
  const [gitHost, setGitHost] = useState("");

  const getGitAppUrl = () => {
    const gitAppUrl = gitHost + "/" + gitApp + ".git"
    return gitAppUrl
  }

  const HandleCopyGitClone = () => {
    const baseUrl = "git clone https://oauth2:"
    const cloneUrl = baseUrl + secretData.SecretString + "@" + getGitAppUrl();
    navigator.clipboard.writeText(cloneUrl);
  };

  const HandleCopySecret = () => {
    navigator.clipboard.writeText(secretData.SecretString || '');
  };

  async function getData() {

    const secrets = await api.getPlatformSecret({
      secretName: repoSecretArn,
    });

    setSecretData(secrets);

    const gitHostParam = await api.getPlatformSSMParam({ paramName: "/opa/gitlab-hostname" });
    setGitHost(gitHostParam.Parameter?.Value?.toString() || "");
  }

  useEffect(() => {
    if (!appPending) {
      setGitHost(gitHostUrl);
    }

    getData()
      .then(() => {
        setLoading(false);
        setError({ isError: false, errorMsg: '' });
      })
      .catch(e => {
        setError({ isError: true, errorMsg: `Unexpected error occurred while retrieving secretsmanager data: ${e}` });
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <InfoCard title="General Information">
        <LinearProgress />
        <Typography>Loading...</Typography>{' '}
      </InfoCard>
    );
  }
  if (error.isError) {
    return <InfoCard title="General Information">{error.errorMsg}</InfoCard>;
  }
  return (
    <InfoCard title="General Information">
      <CardContent>
        <Grid container direction="column" rowSpacing={2}>
          <Grid container>
            <Grid item zeroMinWidth xs={8}>
              <Typography sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>Repository Access Token</Typography>
              <Typography noWrap>
                <IconButton sx={{ p: 0 }} onClick={HandleCopySecret}>
                  <ContentCopyIcon></ContentCopyIcon>
                </IconButton>
                <SecretStringComponent secret={secretData.SecretString ?? ''} />
              </Typography>
            </Grid>
            <Grid item zeroMinWidth xs={16}>
              <Typography sx={{ textTransform: 'uppercase', fontWeight: 'bold', mt: 1 }}>Clone url</Typography>
              <Typography component={'span'} noWrap>
                <table>
                  <tbody>
                    <tr>
                      <td><IconButton sx={{ p: 0 }} onClick={HandleCopyGitClone}>
                        <ContentCopyIcon></ContentCopyIcon>
                      </IconButton></td>
                      <td>
                        <CodeSnippet language="text" text={"git clone https://oauth2:***@" + getGitAppUrl()} />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Typography>
            </Grid>
          </Grid>
        </Grid>
      </CardContent>
    </InfoCard>
  );
};

export const GeneralInfoCard = ({ appPending }: { appPending: boolean }) => {
  const api = useApi(opaApiRef);
  const { entity } = useEntity();
  const awsAppLoadingStatus = useAsyncAwsApp();
  if (appPending) {
    const input = {
      account: '',
      region: '',
      gitApp: entity.metadata.annotations ? entity.metadata.annotations['gitlab.com/project-slug']?.toString() : "",
      gitHostUrl: '',
      repoSecretArn: entity.metadata['repo-secret-arn']?.toString() || '',
      api,
      appPending
    };
    return <OpaAppGeneralInfo input={input} />;
  }
  else {
    if (awsAppLoadingStatus.loading) {
      return <LinearProgress />;
    } else if (awsAppLoadingStatus.component) {

      const env = awsAppLoadingStatus.component.currentEnvironment as AWSECSAppDeploymentEnvironment;

      const input = {
        account: env.providerData.accountNumber,
        region: env.providerData.region,
        gitApp: awsAppLoadingStatus.component.gitRepo,
        gitHostUrl: awsAppLoadingStatus.component.gitHost,
        repoSecretArn: awsAppLoadingStatus.component.repoSecretArn,
        api,
        appPending
      };
      return <OpaAppGeneralInfo input={input} />;
    } else {
      return <EmptyState missing="data" title="No info data to show" description="Info data would show here" />;
    }
  }

};
