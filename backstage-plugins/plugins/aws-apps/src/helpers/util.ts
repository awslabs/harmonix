// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export const base64PayloadConvert = (payload: Object) => {
  let str = '';
  Object.values(payload).forEach(k => {
    str += String.fromCharCode(k);
  });
  return str;
};
