// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  HomePageToolkit,
  HomePageCompanyLogo,
  HomePageStarredEntities,
  TemplateBackstageLogoIcon,
  WelcomeTitle,
} from '@backstage/plugin-home';

import { Content, Page, Header } from '@backstage/core-components';
import { HomePageSearchBar } from '@backstage/plugin-search';
import { SearchContextProvider } from '@backstage/plugin-search-react';
import { Grid, makeStyles } from '@material-ui/core';
import React from 'react';
import { AWSLogoFull } from '../AWSLogoFull';
import { OPALogoFull } from '../OPALogoFull';

const useStyles = makeStyles(theme => ({
  searchBar: {
    display: 'flex',
    maxWidth: '60vw',
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[1],
    padding: '8px 0',
    borderRadius: '50px',
    margin: 'auto',
  },
  searchBarOutline: {
    borderStyle: 'none',
  },
}));


const useLogoStyles = makeStyles(theme => ({
  container: {
    margin: theme.spacing(2, 0),
  },
  svg: {
    width: 'auto',
    height: 100,
  },
  path: {
    fill: '#7df3e1',
  },
}));

export const OPAHomePage = () => {
  const classes = useStyles();
  const { container } = useLogoStyles();

  return (
    <SearchContextProvider>
      <Page themeId="home">
        <Content>

          <Grid container justifyContent="center" spacing={2}>
            <Grid item xs={12} md={5}>
              <HomePageCompanyLogo className={container} logo={<OPALogoFull />} />
            </Grid>
          </Grid>
          <Grid container justifyContent="center" spacing={6}>
            {/* <HomePageCompanyLogo className={container} logo={<CustomerLogoFullTitleLight />} /> */}
            <Grid item xs={12} md={5}>
              <Header title={<WelcomeTitle language={['English']} />} pageTitleOverride="Home" />
            </Grid>
            <Grid container item xs={12} alignItems="center" direction="row">
              <HomePageSearchBar 
                classes={{ root: classes.searchBar }} 
                InputProps={{ classes: { notchedOutline: classes.searchBarOutline } }}
                placeholder="Search" />
            </Grid>
            <Grid container item xs={12}>
              <Grid item xs={12} md={6}>
                <HomePageStarredEntities />
              </Grid>
              <Grid item xs={12} md={6}>
                <HomePageToolkit
                  title="Quick Links"
                  tools={[
                    {
                      url: '/aws-apps-search-page',
                      label: 'AWS Apps',
                      icon: <AWSLogoFull />,
                    },
                    {
                      url: '/catalog',
                      label: 'Catalog',
                      icon: <TemplateBackstageLogoIcon />,
                    },
                    {
                      url: '/docs',
                      label: 'Tech Docs',
                      icon: <TemplateBackstageLogoIcon />,
                    },
                  ]}
                />
              </Grid>
            </Grid>
          </Grid>
        </Content>
      </Page>
    </SearchContextProvider>
  );
};
