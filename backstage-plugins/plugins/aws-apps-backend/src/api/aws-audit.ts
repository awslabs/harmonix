// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { LoggerService } from '@backstage/backend-plugin-api';
import { AwsAppsApi } from './AwsAppsApi';

/** @public */
export interface AwsAuditRequest {
  envProviderPrefix: string;
  envProviderName: string;
  appName: string;
  apiClient: AwsAppsApi;
  roleArn: string;
  logger: LoggerService;
  awsRegion: string;
  awsAccount: string;
  requester: string;
  owner: string;
  actionType: string;
  actionName: string;
  requestArgs?: string;
  status: string;
  message?: string;
}

/** @public */
export interface AwsAuditResponse {
  status: string;
  message: string;
}

/** @public */
export async function createAuditRecord({
  envProviderPrefix,
  envProviderName,
  appName,
  apiClient,
  roleArn,
  awsRegion,
  awsAccount,
  requester,
  owner,
  actionType,
  actionName,
  requestArgs,
  status,
  message,
}: AwsAuditRequest): Promise<AwsAuditResponse> {
  const response: AwsAuditResponse = { status: 'Started', message: '' };

  let tableNameResponse;
  try {
    tableNameResponse = await apiClient.getSSMParameter(
      `/${envProviderPrefix.toLowerCase()}/${envProviderName.toLowerCase()}/${envProviderName.toLowerCase()}-audit`,
    );
  } catch (err) {
    response.status = 'FAILED';
    response.message = `Audit failed - audit table name was set to FIXME. ${tableNameResponse}`;
  }

  if (tableNameResponse?.Parameter?.Value) {
    const recordId = `${awsAccount}#${awsRegion}#${envProviderPrefix}#${envProviderName}#${appName}#${requester}#${actionType}#${new Date().toISOString()}`;
    const auditResponse = await apiClient.putDynamodbTableData({
      tableName: tableNameResponse.Parameter.Value,
      recordId,
      origin: 'Backstage-SDK',
      prefix: envProviderPrefix,
      environmentProviderName: envProviderName,
      appName: appName,
      actionType,
      name: actionName,
      initiatedBy: requester,
      owner,
      assumedRole: roleArn,
      targetAccount: awsAccount,
      targetRegion: awsRegion,
      request: requestArgs ?? '',
      status,
      message: message ?? '',
    });

    if (auditResponse.$metadata.httpStatusCode === 200) {
      response.status = 'Success';
    } else {
      response.status = 'FAILED';
      response.message = "Audit failed - can't extract audit table name.";
    }
  }

  return response;
}
