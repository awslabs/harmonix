// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Theme, useMediaQuery } from '@material-ui/core';
import { Breakpoint, ColumnBreakpoints } from '@backstage/plugin-catalog';

const colDefaults: ColumnBreakpoints = {
  xs: 1,
  sm: 1,
  md: 1,
  lg: 2,
  xl: 3,
};

export function useDynamicColumns(
  cols: ColumnBreakpoints | number | undefined,
): number {
  const matches: (Breakpoint | null)[] = [
    useMediaQuery((theme: Theme) => theme.breakpoints.up('xl')) ? 'xl' : null,
    useMediaQuery((theme: Theme) => theme.breakpoints.up('lg')) ? 'lg' : null,
    useMediaQuery((theme: Theme) => theme.breakpoints.up('md')) ? 'md' : null,
    useMediaQuery((theme: Theme) => theme.breakpoints.up('sm')) ? 'sm' : null,
    useMediaQuery((theme: Theme) => theme.breakpoints.up('xs')) ? 'xs' : null,
  ];

  let numOfCols: number;

  if (typeof cols === 'number') {
    numOfCols = cols;
  } else {
    const breakpoint = matches.find(k => k !== null) ?? 'xs';
    numOfCols = cols?.[breakpoint] ?? colDefaults[breakpoint];
  }

  return numOfCols;
}
