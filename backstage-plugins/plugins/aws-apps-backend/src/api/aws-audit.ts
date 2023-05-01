import { AwsAppsApi } from './AwsAppsApi';
import { Logger } from 'winston';

export interface AwsAuditRequest {
  apiClient: AwsAppsApi;
  roleArn: string;
  logger: Logger;
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

export interface AwsAuditResponse {
  status: string;
  message: string;
}

export async function createAuditRecord(request: AwsAuditRequest): Promise<AwsAuditResponse> {
  const response: AwsAuditResponse = { status: 'Started', message: '' };
  //extract dynamodb audit table name
  // const awsAppsApi = new AwsAppsApi(request.logger, request.auth.credentials, request.awsRegion, request.awsAccount);
  const tableNameResponse = await request.apiClient.getSSMParamer('/baws/Audit');
  if (tableNameResponse.Parameter?.Value) {
    const recordId =
      request.awsAccount +
      '#' +
      request.awsRegion +
      '#' +
      request.requester +
      '#' +
      request.actionType +
      '#' +
      new Date().toISOString();
    const auditResponse = await request.apiClient.putDynamodbTableData(
      tableNameResponse.Parameter.Value,
      recordId,
      'Backstage-SDK',
      request.actionType,
      request.actionName,
      request.requester,
      request.owner,
      request.roleArn,
      request.awsAccount,
      request.awsRegion,
      request.requestArgs || '',
      request.status,
      request.message || '',
    );
    if (auditResponse.$metadata.httpStatusCode == 200) response.status = 'Success';
  } else {
    response.status = 'FAILED';
    response.message = "Audit failed - can't extract audit table name.";
  }

  return response;
}
