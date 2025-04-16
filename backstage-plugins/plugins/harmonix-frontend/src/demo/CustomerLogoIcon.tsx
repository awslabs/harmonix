// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0


import { makeStyles } from '@material-ui/core';
import { useApi, configApiRef } from '@backstage/core-plugin-api';

const useStyles = makeStyles({
  svg: {
    width: 'auto',
    height: 18,
  },
  st0path: {
    fill: '#FFFFFF',
  },
  st1path: {
    fill: '#FFFFFF',
    fillRule: 'evenodd',
    clipRule: 'evenodd',
  },
});

export const CustomerLogoIcon = () => {
  const classes = useStyles();
  const config = useApi(configApiRef);

  return <img className={classes.svg} src={config.getString('app.logoIcon')} />;
};
