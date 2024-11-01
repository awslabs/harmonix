// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// !! CONTRIBUTE TO OPEN SOURCE -- THIS CODE WILL DRIFT/ROT OTHERWISE
import React, { useEffect } from 'react';
import { Box } from '@material-ui/core';

import { alertApiRef, useApi } from '@backstage/core-plugin-api';
import { Select } from '@backstage/core-components';
import {
  EntityTypePickerProps,
  useEntityTypeFilter,
} from '@backstage/plugin-catalog-react';

function filterTypes(
  allTypes: string[],
  allowedTypes?: string[],
): Record<string, string> {
  // Before allTypes is loaded, or when a kind is entered manually in the URL, selectedKind may not
  // be present in allTypes. It should still be shown in the dropdown, but may not have the nice
  // enforced casing from the catalog-backend. This makes a key/value record for the Select options,
  // including selectedKind if it's unknown - but allows the selectedKind to get clobbered by the
  // more proper catalog kind if it exists.
  let availableTypes = allTypes;
  if (allowedTypes) {
    availableTypes = availableTypes.filter(k =>
      allowedTypes.some(
        a => a.toLocaleLowerCase('en-US') === k.toLocaleLowerCase('en-US'),
      ),
    );
  }

  availableTypes.sort((a, b) => {
    if (a < b) {
      return -1;
    }
    if (a > b) {
      return 1;
    }
    return 0;
  });
  return availableTypes.reduce((acc, kind) => {
    acc[kind.toLocaleLowerCase('en-US')] = kind;
    return acc;
  }, {} as Record<string, string>);
}

/**
 * Props for {@link EntityTypePicker}.
 *
 * @public
 */
export interface AdvancedEntityTypePickerProps extends EntityTypePickerProps {
  allowedTypes?: string[];
}

/** @public */
export const AdvancedEntityTypePicker = (
  props: AdvancedEntityTypePickerProps,
) => {
  const { allowedTypes, hidden, initialFilter } = props;
  const alertApi = useApi(alertApiRef);
  const { error, availableTypes, selectedTypes, setSelectedTypes } =
    useEntityTypeFilter();

  useEffect(() => {
    if (error) {
      alertApi.post({
        message: `Failed to load entity types`,
        severity: 'error',
      });
    }
    if (initialFilter) {
      setSelectedTypes([initialFilter]);
    }
  }, [error, alertApi, initialFilter, setSelectedTypes]);

  if (availableTypes.length === 0 || error) return null;

  const options = filterTypes(availableTypes, allowedTypes);

  const items = [
    { value: 'all', label: 'all' },
    ...Object.keys(options).map((key: string) => ({
      value: key,
      label: options[key],
    })),
  ];

  return hidden ? null : (
    <Box pb={1} pt={1}>
      <Select
        label="Type"
        items={items}
        selected={(items.length > 1 ? selectedTypes[0] : undefined) ?? 'all'}
        onChange={value =>
          setSelectedTypes(value === 'all' ? [] : [String(value)])
        }
      />
    </Box>
  );
};
