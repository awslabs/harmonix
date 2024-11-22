// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { createPermission } from '@backstage/plugin-permission-common';

/** @public */
export const readOpaAppAuditPermission = createPermission({
  name: 'opa.app.audit.read',
  attributes: {
    action: 'read',
  },
});

/** @public */
export const opaPermissions = [readOpaAppAuditPermission];
