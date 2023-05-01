// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { CodeSnippet, InfoCard, EmptyState } from '@backstage/core-components';
import { LinearProgress } from '@material-ui/core';
import { useApi } from '@backstage/core-plugin-api';
import { bawsApiRef } from '../../api';
import { Typography, CardContent, IconButton, Grid } from '@mui/material';
import { GetSecretValueCommandOutput } from '@aws-sdk/client-secrets-manager';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { SecretStringComponent } from '../common';
import { useAsyncAwsApp } from '../../hooks/useAwsApp';

const BawsAppGeneralInfo = ({
  input: { account, region, gitHost, gitApp, repoSecretArn }
}: { input: { account: string, region: string, gitHost: string, gitApp: string, repoSecretArn: string } }) => {
  const bawsApi = useApi(bawsApiRef);
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

  const gitAppUrl = gitHost + "/" + gitApp + ".git"

  const HandleCopyGitClone = () => {
    const baseUrl = "git clone https://oauth2:"
    const cloneUrl = baseUrl + secretData.SecretString + "@" + gitAppUrl;
    navigator.clipboard.writeText(cloneUrl);
  };

  const HandleCopySecret = () => {
    navigator.clipboard.writeText(secretData.SecretString || '');
  };

  async function getData() {
    const secrets = await bawsApi.getSecret({
      account: account,
      region: region,
      secretName: repoSecretArn,
    });

    setSecretData(secrets);
  }

  useEffect(() => {
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
                        <CodeSnippet language="text" text={"git clone https://oauth2:***@" + gitAppUrl} />
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

export const GeneralInfoCard = () => {
  const awsAppLoadingStatus = useAsyncAwsApp();

  if (awsAppLoadingStatus.loading) {
    return <LinearProgress />;
  } else if (awsAppLoadingStatus.deployments) {
    const env1 = awsAppLoadingStatus.deployments
      .environments[Object.keys(awsAppLoadingStatus.deployments.environments)[0]];
    const input = {
      account: env1.accountNumber,
      region: env1.region,
      gitApp: awsAppLoadingStatus.deployments.gitApp,
      gitHost: awsAppLoadingStatus.deployments.gitHost,
      repoSecretArn: awsAppLoadingStatus.deployments.repoSecretArn,
    };
    return <BawsAppGeneralInfo input={input} />;
  } else {
    return <EmptyState missing="data" title="No info data to show" description="Info data would show here" />;
  }
};
