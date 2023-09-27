// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
