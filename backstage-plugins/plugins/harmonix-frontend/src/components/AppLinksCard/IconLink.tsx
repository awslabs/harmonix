// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { makeStyles, Box, Typography } from '@material-ui/core';
import LanguageIcon from '@material-ui/icons/Language';
import React from 'react';
import { Link } from '@backstage/core-components';
import { IconComponent } from '@backstage/core-plugin-api';

const useStyles = makeStyles({
  svgIcon: {
    display: 'inline-block',
    '& svg': {
      display: 'inline-block',
      fontSize: 'inherit',
      verticalAlign: 'baseline',
    },
  },
});

export function IconLink(props: {
  href: string;
  text?: string;
  Icon?: IconComponent;
}) {
  const { href, text, Icon } = props;
  const classes = useStyles();

  return (
    <Box display="flex">
      <Box mr={1} className={classes.svgIcon}>
        <Typography component="div">
          {Icon ? <Icon /> : <LanguageIcon />}
        </Typography>
      </Box>
      <Box flexGrow="1">
        <Link to={href} target="_blank" rel="noopener">
          {text ?? href}
        </Link>
      </Box>
    </Box>
  );
}
