// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export const handler = async (event: any) => {
  return Object.entries(event).map(([key, val]) => ({
    Name: key,
    Value: val,
    Type: "PLAINTEXT",
  }));
};
