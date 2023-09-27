// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
// import { getAWScreds, AwsAppsApi, createAuditRecord } from '@aws/plugin-aws-apps-backend-for-backstage';
import { EnvironmentProvider, } from '../../types';

export function createS3BucketAction() {
  return createTemplateAction<{
    bucketName: string;
    envProviders: EnvironmentProvider[];
    tags?: { Key: string, Value: string | number | boolean }[];
  }>({
    id: 'opa:create-s3-bucket',
    description: 'Creates an S3 bucket',
    schema: {
      input: {
        type: 'object',
        required: ['bucketName', 'envProviders'],
        properties: {
          bucketName: {
            title: 'Bucket Name',
            description: 'The name of the S3 bucket to create',
            type: 'string',
          },
          envProviders: {
            title: 'AWS Environment Providers',
            description: 'The AWS environment providers containing account and region info',
            type: 'array',
          },
          tags: {
            title: 'AWS Tags',
            description: 'key/value pairs to apply as tags to any created AWS resources',
            type: 'array',
            minProperties: 1,
            items: [
              {
                type: 'object',
                properties: {
                  Key: { type: 'string' },
                  Value: { type: ['string', 'number', 'boolean'] }
                }
              },
            ],
          },
        },
      },
      output: {
        type: 'object',
        required: [
          'awsBucketName',
        ],
        properties: {
          awsBucketName: {
            title: 'S3 Bucket Name',
            type: 'string',
          },
        },
      },
    },
    async handler() {

      // We plan to remove/depricate this scaffolder action...

      // const { bucketName, tags, envProviders } = ctx.input;

      // // TODO add support for multiaccount/multiregion
      // const { accountId, region } = envProviders[0];

      // const creds = await getAWScreds(accountId, region, ctx.user!.entity!);

      // const apiClient = new AwsAppsApi(ctx.logger, creds.credentials, region, accountId);

      // ctx.logger.info(`Creating bucket with name: ${bucketName}-${accountId}-${region}`);

      // try {
      //   const response = await apiClient.createS3Bucket(bucketName, tags);
      //   ctx.output('awsBucketName', response.Location!.slice(1));

      //   const auditResponse = await createAuditRecord({
      //     actionType: 'Create S3 Bucket',
      //     actionName: response.Location!.slice(1),
      //     apiClient: apiClient,
      //     roleArn: creds.roleArn,
      //     awsAccount: accountId,
      //     awsRegion: region,
      //     logger: ctx.logger,
      //     requester: ctx.user!.entity!.metadata.name,
      //     status: response.$metadata.httpStatusCode == 200 ? 'SUCCESS' : 'FAILED',
      //     owner: creds.owner || '',
      //     envProviderName: "FIXME", // FIXME createS3BucketAction pass envProviderName
      //     envProviderPrefix: "FIXME", // FIXME createS3BucketAction pass envProviderPrefix

      //   });
      //   if (auditResponse.status === 'FAILED') {
      //     throw Error;
      //   }
      // } catch (e) {
      //   throw new Error(e instanceof Error ? e.message : JSON.stringify(e));
      // }
    },
  });
}
