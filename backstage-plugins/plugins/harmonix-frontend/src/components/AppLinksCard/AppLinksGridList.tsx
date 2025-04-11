// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ImageList, ImageListItem } from '@material-ui/core';
import React from 'react';
import { IconLink } from './IconLink';
import { ColumnBreakpoints } from '@backstage/plugin-catalog';
import { useDynamicColumns } from './useDynamicColumns';
import { IconComponent } from '@backstage/core-plugin-api';

export interface AppLinksGridListItem {
  href: string;
  text?: string;
  Icon?: IconComponent;
}

interface AppLinksGridListProps {
  items: AppLinksGridListItem[];
  cols?: ColumnBreakpoints | number;
}

export function AppLinksGridList(props: AppLinksGridListProps) {
  const { items, cols = undefined } = props;
  const numOfCols = useDynamicColumns(cols);

  return (
    <ImageList rowHeight="auto" cols={numOfCols}>
      {items.map(({ text, href, Icon }, i) => (
        <ImageListItem key={i}>
          <IconLink href={href} text={text ?? href} Icon={Icon} />
        </ImageListItem>
      ))}
    </ImageList>
  );
}
