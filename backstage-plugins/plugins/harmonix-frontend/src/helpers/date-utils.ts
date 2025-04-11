// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export function formatWithTime(date: Date): string {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const zone = date.toString().slice(date.toString().lastIndexOf('('));
  return `${month}/${day}/${year} ${date.toLocaleTimeString()} ${zone}`
} 
