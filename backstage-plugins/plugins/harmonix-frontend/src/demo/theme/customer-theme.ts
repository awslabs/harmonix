// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { BackstageOverrides } from '@backstage/core-components';
import { BackstageOverrides as CatalogReactOverrides } from '@backstage/plugin-catalog-react';
import { BackstageTheme, createTheme, lightTheme } from '@backstage/theme';
import { Overrides as _overrides } from "@material-ui/core/styles/overrides";
import { AutocompleteClassKey } from '@material-ui/lab/Autocomplete';
import { AlertClassKey } from '@material-ui/lab/Alert';

// Labs types not included in overrides; https://github.com/mui/material-ui/issues/19427
declare module '@material-ui/core/styles/overrides' {
  export interface ComponentNameToClassKey {
    MuiAlert: AlertClassKey;
    MuiAutocomplete: AutocompleteClassKey;
  }
}

const baseTheme = createTheme({
  palette: {
    ...lightTheme.palette,
    primary: {
      main: '#244671', //'#FF9900', // '#0052CC',
      light: '#4C9AFF',
      dark: '#244671', // '#172B4D',
    },
    secondary: {
      main: '#272B34',
      light: '#FFAB00',
      dark: '#272B34',
    },
    grey: {
      50: '#C1C7D0',
      100: '#7A869A',
      200: '#6B778C',
      300: '#5E6C84',
      400: '#505F79',
      500: '#42526E',
      600: '#344563',
      700: '#253858',
      800: '#172B4D',
      900: '#091E42',
    },
    error: {
      main: '#FF5630',
      light: '#FF8F73',
      dark: '#DE350B',
    },
    warning: {
      main: '#FFAB00',
      light: '#FFE380',
      dark: '#FF8B00',
    },
    success: {
      main: '#36B37E',
      light: '#79F2C0',
      dark: '#006644',
    },
    info: {
      main: '#0065FF',
      light: '#4C9AFF',
      dark: '#0747A6',
    },
    navigation: {
      ...lightTheme.palette.navigation,
      background: '#1d1f23', //'#172B4D',
      color: '#B5B5B5',
      selectedColor: '#F7F8F9',
      indicator: '#244671', // '#2684FF',
      navItem: {
        hoverBackground: 'rgba(251,216,191,0.6)', //'rgba(241,243,243,0.6)', // 'rgba(116,118,121,0.6)',
      },
    },
    text: {
      primary: '#244671',
    },
    background: {
      default: '#F7F8F9',
    },
  },
  fontFamily: '"Amazon Ember", Roboto, sans-serif',
  defaultPageTheme: 'home',
});

const createCustomThemeOverrides = (theme: BackstageTheme): BackstageOverrides & CatalogReactOverrides => {
  return {
    BackstageHeader: {
      header: {
        backgroundImage: 'unset',
        boxShadow: 'unset',
        // paddingBottom: theme.spacing(1),
      },
      title: {
        color: theme.palette.primary.dark,
        fontWeight: 900,
      },
      subtitle: {
        color: theme.palette.primary.dark,
      },
      type: {
        color: theme.palette.primary.dark,
      },
    },
    BackstageHeaderLabel: {
      label: {
        color: 'rgba(0, 0, 0, 0.54)',
      },
      value: {
        color: 'rgba(0, 0, 0, 0.54)',
      },
    },
    BackstageHeaderTabs: {
      defaultTab: {
        fontSize: 'inherit',
        textTransform: 'none',
      },
    },
    BackstageOpenedDropdown: {
      icon: {
        '& path': {
          fill: '#F7F8F9',
        },
      },
    },
    BackstageTable: {
      root: {
        '&> :first-child': {
          borderBottom: '1px solid #D5D5D5',
          boxShadow: 'none',
        },
        '& th': {
          borderTop: 'none',
          textTransform: 'none !important',
        },
      },
    },
    CatalogReactUserListPicker: {
      title: {
        textTransform: 'none',
      },
    },
    MuiAlert: {
      root: {
        borderRadius: 0,
      },
      standardError: {
        color: '#F7F8F9',
        backgroundColor: theme.palette.error.dark,
        '& $icon': {
          color: '#F7F8F9',
        },
      },
      standardInfo: {
        color: '#F7F8F9',
        backgroundColor: theme.palette.primary.dark,
        '& $icon': {
          color: '#F7F8F9',
        },
      },
      standardSuccess: {
        color: '#F7F8F9',
        backgroundColor: theme.palette.success.dark,
        '& $icon': {
          color: '#F7F8F9',
        },
      },
      standardWarning: {
        color: theme.palette.grey[700],
        backgroundColor: theme.palette.secondary.light,
        '& $icon': {
          color: theme.palette.grey[700],
        },
      },
    },
    MuiAutocomplete: {
      root: {
        '&[aria-expanded=true]': {
          backgroundColor: '#26385A',
          color: '#F7F8F9',
        },
        '&[aria-expanded=true] path': {
          fill: '#F7F8F9',
        },
      },
    },
    MuiBackdrop: {
      root: {
        backgroundColor: 'rgba(9,30,69,0.54)',
      },
    },
    MuiButton: {
      root: {
        borderRadius: 3,
        textTransform: 'none',
      },
      contained: {
        boxShadow: 'none',
      },
    },
    MuiIconButton: {
      label: {
        color: 'rgba(0, 0, 0, 0.54)',
      },
    },
    MuiChip: {
      root: {
        borderRadius: 3,
        backgroundColor: theme.palette.grey[50],
        color: theme.palette.primary.dark,
        margin: 4,
      },
    },
    MuiSelect: {
      root: {
        '&[aria-expanded]': {
          backgroundColor: '#26385A',
          color: '#F7F8F9',
        },
      },
    },
    MuiSwitch: {
      root: {
        padding: 10,
      },
      switchBase: {
        padding: 12,
      },
      thumb: {
        backgroundColor: '#F7F8F9',
        height: 14,
        width: 14,
      },
      track: {
        borderRadius: 9,
      },
    },
    MuiTabs: {
      indicator: {
        transition: 'none',
      },
    },
    MuiTypography: {
      button: {
        textTransform: 'none',
      },
    },
  };
};

export const customerTheme: BackstageTheme = {
  ...baseTheme,
  overrides: {
    ...baseTheme.overrides,
    ...createCustomThemeOverrides(baseTheme),
  },
};
