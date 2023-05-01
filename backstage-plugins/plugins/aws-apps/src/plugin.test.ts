// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { bawsPlugin } from './plugin';

describe('aws-apps', () => {
  it('should export plugin', () => {
    expect(bawsPlugin).toBeDefined();
  });
});
