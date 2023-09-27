// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { awsAppsDemoPlugin } from './plugin';

describe('aws-apps-demo', () => {
  it('should export plugin', () => {
    expect(awsAppsDemoPlugin).toBeDefined();
  });
});
