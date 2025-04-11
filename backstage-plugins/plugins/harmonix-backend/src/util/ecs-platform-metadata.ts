// Copyright 2023 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated or distributed without permission.

import { parse } from '@aws-sdk/util-arn-parser';

const METADATA_ENDPOINT_V4 = process.env.ECS_CONTAINER_METADATA_URI_V4 as string;

/**
 * Get a value from the ECS Container metadata endpoint for a given key
 * See ECS metadata documentation for supported keys: @see https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-metadata-endpoint-v4-fargate.html
 */
export async function getECSContainerMetadata(key: string): Promise<any> {
  // return the value of the key from the metadata endpoint
  const response = await fetch(METADATA_ENDPOINT_V4);
  const json = await response.json();
  return json[key];
}

/**
 * Get a value from the ECS Task metadata endpoint for a given key
 * See ECS metadata documentation for supported keys: @see https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-metadata-endpoint-v4-fargate.html
 */
export async function getECSTaskMetadata(key: string): Promise<any> {
  // return the value of the key from the task metadata endpoint
  const response = await fetch(`${METADATA_ENDPOINT_V4}/task`);
  const json = await response.json();
  return json[key];
}

/**
 * Get the region for the current ECS task
 * @returns a string representing the AWS region where the task is running
 */
export async function getECSTaskRegion(): Promise<string> {
  const taskARN = await getECSTaskMetadata('TaskARN');
  const { region } = parse(taskARN);
  return region;
}
