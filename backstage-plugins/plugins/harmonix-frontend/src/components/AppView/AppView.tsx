// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  Grid,
  Typography,
  IconButton,
  Divider,
  Card,
  CardHeader,
  CardContent,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import React from 'react';
import { OPAAppData } from '../../types';

export const AboutField = ({
  label,
  value,
  gridSizes,
  children,
}: {
  label: string;
  value?: string | JSX.Element;
  gridSizes?: Record<string, number>;
  children?: React.ReactNode;
}) => {

  // Content is either children or a string prop `value`
  const content = React.Children.count(children) ? (
    children
  ) : (
    <Typography variant="body2" >
      {value || `unknown`}
    </Typography>
  );
  return (
    <Grid item {...gridSizes}>
      <Typography variant="subtitle2" >
        {label}
      </Typography>
      {content}
    </Grid>
  );
};

export const AppView = ({
  appData,
}: {
  appData: OPAAppData;
}): JSX.Element => {
  Object.keys(appData).forEach(key => {
    const newkey = key.replace("opa/", "")
    appData[newkey] = appData[key];
    delete appData[key];
  });
  const details = appData
  console.log(appData)

  return (
    <div>
      {appData && (
        <>
          <Card>
            <CardHeader
              title={<Typography variant="h5">OPA App</Typography>}
            /><Divider />
            <CardContent>
              <Grid container columnSpacing={2}>
                <Grid item xs={4}>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      pt: 3,
                      color: '#645B59',
                      fontWeight: 'bold',
                    }}
                  >
                    General Info
                  </Typography>
                  <Grid container>
                    <Grid item>
                      <Typography sx={{ pt: 3, color: '#645B59' }}>
                        repo url
                      </Typography>
                      <Typography>
                        <IconButton>
                          <ContentCopyIcon />
                        </IconButton>
                        {details?.repourl}
                      </Typography>
                      <Typography sx={{ pt: 3, color: '#645B59' }}>
                        repo token
                      </Typography>
                      <Typography>
                        <IconButton>
                          <ContentCopyIcon />
                        </IconButton>
                        {details?.repotoken}
                      </Typography>
                      <Typography sx={{ pt: 3, color: '#645B59' }}>
                        Public
                      </Typography>
                      <Typography
                        sx={details?.public ? { color: 'Green' } : { color: 'Red' }}
                      >
                        {details?.public ? 'Yes' : 'No'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
                <Divider
                  orientation="vertical"
                  flexItem
                  sx={{ mr: '-1px', mt: 2 }}
                />
                <Grid item xs={4}>
                  <Typography
                    variant="subtitle1"
                    sx={{ pt: 3, color: '#645B59', fontWeight: 'bold' }}
                  >
                    Deployment Info
                  </Typography>
                  <Grid container>
                    <Grid item xs={6}>
                      <Typography sx={{ pt: 3, color: '#645B59' }}>
                        Template
                      </Typography>
                      <Typography sx={{ mt: 1 }}>{details?.template}</Typography>
                      <Typography sx={{ pt: 3, color: '#645B59' }}>
                        Account
                      </Typography>
                      <Typography>
                        <IconButton>
                          <ContentCopyIcon />
                        </IconButton>
                        {details?.account}
                      </Typography>
                      <Typography sx={{ pt: 3, color: '#645B59' }}>
                        Region
                      </Typography>
                      <Typography sx={{ mt: 1 }}>{details?.region}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography sx={{ pt: 3, color: '#645B59' }}>
                        Version
                      </Typography>
                      <Typography sx={{ mt: 1 }}>1.0.0</Typography>
                      <Typography sx={{ pt: 3, color: '#645B59' }}>
                        Environment
                      </Typography>
                      <Typography sx={{ mt: 1 }}>{details?.environment}</Typography>
                      <Typography sx={{ pt: 3, color: '#645B59' }}>
                        Owner
                      </Typography>
                      <Typography sx={{ mt: 1 }}>{details?.owner}</Typography>
                    </Grid>
                  </Grid>
                </Grid>

              </Grid>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
