// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Provides shared objects useful for interacting with the aws-apps plugins
 *
 * @packageDocumentation
 */

export * from './types';
export * from './permissions';
export * from './utils/git-util';

export { type AWSEnvironmentProviderEntityV1, awsEnvironmentProviderEntityV1Validator } from './entities/AWSEnvironmentProviderEntityV1';
export { type AWSEnvironmentEntityV1,awsEnvironmentEntityV1Validator } from './entities/AWSEnvironmentEntityV1';