// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { makeStyles } from '@material-ui/core';
import { useApi, configApiRef } from '@backstage/core-plugin-api';

const useStyles = makeStyles({
  svg: {
    width: '350%',
    height: 'auto',
  },
});
export const CustomerLogoFullLight = () => {
  const classes = useStyles();
  const config = useApi(configApiRef);

  return <img className={classes.svg} src={config.getString('app.logo')} />;
};
