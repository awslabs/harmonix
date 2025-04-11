// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { BackstageTheme } from '@backstage/theme';
import { Button, makeStyles, Typography } from '@material-ui/core';
import React from 'react';
import { CodeSnippet } from '@backstage/core-components';

const ENTITY_YAML = `metadata:
  name: example
  links:
    - url: https://dashboard.example.com
      title: My Dashboard
      icon: dashboard`;

/** @public */
export type AppLinksEmptyStateClassKey = 'code';

const useStyles = makeStyles<BackstageTheme>(
  theme => ({
    code: {
      borderRadius: 6,
      margin: theme.spacing(2, 0),
      background:
        theme.palette.type === 'dark' ? '#444' : theme.palette.common.white,
    },
  }),
  { name: 'PluginCatalogAppLinksEmptyState' },
);

export function AppLinksEmptyState() {
  const classes = useStyles();

  return (
    <>
      <Typography variant="body1">
        No links defined for this entity. You can add links to your entity YAML
        as shown in the highlighted example below:
      </Typography>
      <div className={classes.code}>
        <CodeSnippet
          text={ENTITY_YAML}
          language="yaml"
          showLineNumbers
          highlightedNumbers={[3, 4, 5, 6]}
          customStyle={{ background: 'inherit', fontSize: '115%' }}
        />
      </div>
      <Button
        variant="contained"
        color="primary"
        target="_blank"
        href="https://backstage.io/docs/features/software-catalog/descriptor-format#links-optional"
      >
        Read more
      </Button>
    </>
  );
}
