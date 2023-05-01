// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0


import { IdentityApi } from '@backstage/plugin-auth-node';
import express from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import { AwsAppsApi, getAWScreds } from '../api';
import { AwsAuditResponse, createAuditRecord } from '../api/aws-audit';

export interface RouterOptions {
  logger: Logger;
  userIdentity?: IdentityApi;
}

export async function createRouter(options: RouterOptions): Promise<express.Router> {
  const { logger, userIdentity } = options;
  const router = Router();

  //Async function to get backend API client
  async function getApiClient(
    req: any,
  ): Promise<{ apiClient: AwsAppsApi; apiClientConfig: ApiClientConfig }> {
    const awsRegion = req.body.awsRegion?.toString();

    const awsAccount = req.body.awsAccount?.toString();

    if (awsRegion === undefined || awsAccount === undefined) {
      throw Error;
    }
    const identity = await userIdentity?.getIdentity({ request: req });

    const creds = await getAWScreds(awsAccount, awsRegion, undefined, identity?.identity);

    const roleArn = creds.roleArn;

    const apiClient = new AwsAppsApi(logger, creds.credentials, awsRegion, awsAccount);

    const requester = identity?.identity.userEntityRef.split('/')[1] || '';

    const owner = creds.owner || '';

    return { apiClient, apiClientConfig: { apiClient, roleArn, awsAccount, awsRegion, requester, owner } };
  }

  async function createRouterAuditRecord(
    { actionType, actionName, status, apiClientConfig }: {
      actionType: string,
      actionName: string,
      status: string,
      apiClientConfig: ApiClientConfig,
    }
  ): Promise<AwsAuditResponse> {

    const auditResponse = await createAuditRecord({
      actionType,
      actionName,
      apiClient: apiClientConfig.apiClient,
      roleArn: apiClientConfig.roleArn,
      awsAccount: apiClientConfig.awsAccount,
      awsRegion: apiClientConfig.awsRegion,
      logger,
      requester: apiClientConfig.requester,
      status,
      owner: apiClientConfig.owner,
    });

    return auditResponse;
  }

  router.use(express.json());
  router.get('/health', (_, response) => {
    logger.info('PONG!');
    response.json({ status: 'ok' });
  });

  //Route for getting ECS task details
  router.post('/ecs', async (req, res) => {
    logger.info('router entry: /ecs');
    const { apiClient, apiClientConfig } = await getApiClient(req);
    const clusterName = req.body.clusterName?.toString();
    const serviceName = req.body.serviceName?.toString();
    const service = await apiClient.getEcsServiceTask(clusterName, serviceName);

    const auditResponse = await createRouterAuditRecord({
      actionType: 'List ECS Tasks',
      actionName: clusterName + '#' + serviceName,
      status: service.$metadata.httpStatusCode == 200 ? 'SUCCESS' : 'FAILED',
      apiClientConfig,
    });
    if (auditResponse.status == 'FAILED') res.status(500).json({ message: 'auditing request FAILED.' });

    if (service.taskArns?.length === 0) {
      res.status(200).json({});
      return;
    }
    const tasks = await apiClient.describeClusterTasks(clusterName, service.taskArns!);
    res.status(200).json(tasks.tasks![0]);
  });

  //Route for updating ECS service
  router.post('/ecs/updateService', async (req, res) => {
    logger.info('router entry: /ecs/updateService');
    const { apiClient, apiClientConfig } = await getApiClient(req);
    const clusterName = req.body.clusterName?.toString();
    const serviceName = req.body.serviceName?.toString();
    const taskDefinition = req.body.taskDefinition?.toString();
    const restart = /true/i.test(req.body.restart?.toString());
    let desiredCount;
    if (req.body.desiredCount === undefined) {
      desiredCount = undefined;
    } else {
      desiredCount = parseInt(req.body.desiredCount.toString());
    }
    const service = await apiClient.updateServiceTask(
      clusterName,
      serviceName,
      taskDefinition,
      restart,
      desiredCount,
    );

    const auditResponse = await createRouterAuditRecord({
      actionType: 'Update ECS Service',
      actionName: clusterName + '#' + serviceName,
      status: service.$metadata.httpStatusCode == 200 ? 'SUCCESS' : 'FAILED',
      apiClientConfig,
    });
    if (auditResponse.status == 'FAILED') res.status(500).json({ message: 'auditing request FAILED.' });
    res.status(200).json(service.service);
  });

  //Route for getting secret value from secretsmanager
  router.post('/secrets', async (req, res) => {
    logger.info('router entry: /secrets');
    const { apiClient, apiClientConfig } = await getApiClient(req);
    const secretArn = req.body.secretArn?.toString();
    const service = await apiClient.getSecretValue(secretArn);

    const auditResponse = await createRouterAuditRecord({
      actionType: 'Get Secret',
      actionName: secretArn,
      status: service.$metadata.httpStatusCode == 200 ? 'SUCCESS' : 'FAILED',
      apiClientConfig,
    });
    if (auditResponse.status == 'FAILED') res.status(500).json({ message: 'auditing request FAILED.' });
    res.status(200).json(service);
  });

  //Route for getting resource
  router.post('/resource-group', async (req, res) => {
    logger.info('router entry: /resource-group');
    const { apiClient, apiClientConfig } = await getApiClient(req);
    const resourceGroupName = req.body.resourceGroupName?.toString();
    let serviceResult;
    let serviceResultErrorName: string | undefined;
    try {
      serviceResult = await apiClient.getCategorizedResources(resourceGroupName);
    } catch (e) {
      serviceResultErrorName = (e as Error).name;
    }

    const auditResponse = await createRouterAuditRecord({
      actionType: 'Get Resource Group',
      actionName: resourceGroupName,
      status: !serviceResultErrorName ? 'SUCCESS' : 'FAILED',
      apiClientConfig,
    });
    if (auditResponse.status == 'FAILED') {
      res.status(500).json({ message: 'auditing request FAILED.' });
    }
    if (serviceResultErrorName) {
      if (serviceResultErrorName === 'NotFoundException') {
        // This does not represent a permanent error. It could be that the resource
        // group is not created until the app is deployed. This will be the case when the
        // resource group is based upon a CloudFormation stack, such as a SAM template.
        res.status(404).json({ message: serviceResultErrorName });
      } else {
        logger.error(`Failed to get resource group ${resourceGroupName} - ${serviceResultErrorName}`)
        res.status(500).json({ message: serviceResultErrorName });
      }
    }

    res.status(200).json(serviceResult);
  });

  //Route for getting parameter from SSM
  router.post('/ssm-parameter', async (req, res) => {
    logger.info('router entry: /ssm-parameter');
    const { apiClient, apiClientConfig } = await getApiClient(req);
    const ssmParamName = req.body.ssmParamName?.toString();
    const serviceResult = await apiClient.getSSMParameter(ssmParamName);
    
    const auditResponse = await createRouterAuditRecord({
      actionType: 'Fetch SSM Param',
      actionName: ssmParamName,
      status: serviceResult.$metadata.httpStatusCode == 200 ? 'SUCCESS' : 'FAILED',
      apiClientConfig,
    });
    if (auditResponse.status == 'FAILED') res.status(500).json({ message: 'auditing request FAILED.' });

    res.status(200).json(serviceResult);
  });

  router.post('/logs/stream', async (req, res) => {
    logger.info('router entry: /logs/stream');
    const { apiClient, apiClientConfig } = await getApiClient(req);
    const logGroupName = req.body.logGroupName?.toString();
    const logStreams = await apiClient.getLogStreams(logGroupName);

    const auditResponse = await createRouterAuditRecord({
      actionType: 'Get Log Stream',
      actionName: logGroupName,
      status: logStreams.$metadata.httpStatusCode == 200 ? 'SUCCESS' : 'FAILED',
      apiClientConfig,
    });
    if (auditResponse.status == 'FAILED') res.status(500).json({ message: 'auditing request FAILED.' });
    res.status(200).json(logStreams.logStreams);
  });

  //Route for getting stream events from a log stream
  router.post('/logs/stream-events', async (req, res) => {
    logger.info('router entry: /logs/stream-events');
    const { apiClient, apiClientConfig } = await getApiClient(req);
    const logGroupName = req.body.logGroupName?.toString();
    const logStreamName = req.body.logStreamName?.toString();
    const logStreamEvents = await apiClient.getLogGroupEvents(logGroupName, logStreamName);

    let text = '';
    if (logStreamEvents.events) {
      text = logStreamEvents.events
        .map(logEvent => {
          return logEvent.message;
        })
        .join('\n');
    }

    const auditResponse = await createRouterAuditRecord({
      actionType: 'Get Log Stream Events',
      actionName: logStreamName,
      status: logStreamEvents.$metadata.httpStatusCode == 200 ? 'SUCCESS' : 'FAILED',
      apiClientConfig,
    });
    if (auditResponse.status == 'FAILED') res.status(500).json({ message: 'auditing request FAILED.' });
    res.status(200).set('Content-Type', 'text/plain').send(text);
  });

  //Route for updating a ECS taskdefinition
  router.post('/ecs/updateTaskDefinition', async (req, res) => {
    logger.info('router entry: /ecs/updateTaskDefinition');
    const { apiClient, apiClientConfig } = await getApiClient(req);
    const taskDefinition = req.body.taskDefinition?.toString();
    const envVar = req.body.envVar;
    const oldTaskDefinition = await apiClient.describeTaskDefinition(taskDefinition);
    const newCd = oldTaskDefinition.taskDefinition?.containerDefinitions?.map((td, index) => {
      return Object.assign({}, td, { name: envVar[index].containerName, environment: envVar[index].env });
    });
    const newTd = Object.assign({}, oldTaskDefinition.taskDefinition, { containerDefinitions: newCd });

    const output = await apiClient.registerTaskDefinition(newTd);

    const auditResponse = await createRouterAuditRecord({
      actionType: 'Update TaskDefinition',
      actionName: taskDefinition,
      status: output.$metadata.httpStatusCode == 200 ? 'SUCCESS' : 'FAILED',
      apiClientConfig,
    });
    if (auditResponse.status == 'FAILED') res.status(500).json({ message: 'auditing request FAILED.' });
    res.status(200).json(output.taskDefinition);
  });

  //Route for getting ECS taskdefinition details
  router.post('/ecs/describeTaskDefinition', async (req, res) => {
    logger.info('router entry: /ecs/describeTaskDefinition');
    const { apiClient } = await getApiClient(req);
    const taskDefinition = req.body.taskDefinition?.toString();
    const taskDefinitionOutout = await apiClient.describeTaskDefinition(taskDefinition);
    res.status(200).json(taskDefinitionOutout.taskDefinition);
  });

  //Route for quering dynamoDB
  router.post('/dynamo-db/query', async (req, res) => {
    logger.info('router entry: /dynamo-db/query');
    const { apiClient, apiClientConfig } = await getApiClient(req);
    const appName = req.body.appName?.toString();
    const auditTableName = await apiClient.getSSMParamer('/baws/Audit');
    if (auditTableName.Parameter?.Value) {
      const resutls = await apiClient.getDynamodbTable(auditTableName.Parameter?.Value, appName, 1);
      
      const auditResponse = await createRouterAuditRecord({
        actionType: 'Get Audit Table',
        actionName: appName,
        status: resutls.$metadata.httpStatusCode == 200 ? 'SUCCESS' : 'FAILED',
        apiClientConfig,
      });
      if (auditResponse.status == 'FAILED') res.status(500).json({ message: 'auditing request FAILED.' });
      res.status(200).json(resutls);
    } else {
      res.status(400).send({
        error: 'Cant fetch audit table name',
      });
    }
  });

  // Route for getting CloudFormation stack details 
  router.post('/cloudformation/describeStack', async (req, res) => {
    logger.info('router entry: /cloudformation/describeStack');
    const { apiClient } = await getApiClient(req);
    const stackName = req.body.stackName?.toString();
    const stackOutput = await apiClient.describeStack(stackName);
    if (stackOutput.Stacks?.[0]) {
      res.status(200).json(stackOutput.Stacks?.[0]);
    } else {
      res.status(400).send({
        error: 'Cant fetch stack',
      });
    }

  });

  // Route for describing CloudFormation stack events
  router.post('/cloudformation/describeStackEvents', async (req, res) => {
    logger.info('router entry: /cloudformation/describeStackEvents');
    const { apiClient } = await getApiClient(req);

    const stackName = req.body.stackName?.toString();

    const stackOutput = await apiClient.describeStackEvents(stackName);
    res.status(200).json(stackOutput);
  });

  // Route for updating a CloudFormation stack
  router.post('/cloudformation/updateStack', async (req, res) => {
    logger.info('router entry: /cloudformation/updateStack');
    const { apiClient, apiClientConfig } = await getApiClient(req);

    const componentName = req.body.componentName?.toString();
    const stackName = req.body.stackName?.toString();
    const s3BucketName = req.body.s3BucketName?.toString();
    const cfFileName = req.body.cfFileName?.toString();

    const stackOutput = await apiClient.updateStack(componentName, stackName, s3BucketName, cfFileName);

    const auditResponse = await createRouterAuditRecord({
      actionType: 'Update Stack',
      actionName: componentName,
      status: stackOutput.$metadata.httpStatusCode == 200 ? 'SUCCESS' : 'FAILED',
      apiClientConfig,
    });
    if (auditResponse.status == 'FAILED') res.status(500).json({ message: 'auditing request FAILED.' });
    res.status(200).json(stackOutput);

  });

  // Route for creating a CloudFormation stack
  router.post('/cloudformation/createStack', async (req, res) => {
    logger.info('router entry: /cloudformation/createStack');
    const { apiClient, apiClientConfig } = await getApiClient(req);

    const componentName = req.body.componentName?.toString();
    const stackName = req.body.stackName?.toString();
    const s3BucketName = req.body.s3BucketName?.toString();
    const cfFileName = req.body.cfFileName?.toString();

    const stackOutput = await apiClient.createStack(componentName, stackName, s3BucketName, cfFileName);

    const auditResponse = await createRouterAuditRecord({
      actionType: 'Create Stack',
      actionName: componentName,
      status: stackOutput.$metadata.httpStatusCode == 200 ? 'SUCCESS' : 'FAILED',
      apiClientConfig,
    });
    if (auditResponse.status == 'FAILED') {
      res.status(500).json({ message: 'auditing request FAILED.' });
    }

    res.status(200).json(stackOutput);

  });

  // Route for deleting a CloudFormation stack
  router.post('/cloudformation/deleteStack', async (req, res) => {
    logger.info('router entry: /cloudformation/deleteStack');
    const { apiClient, apiClientConfig } = await getApiClient(req);

    const componentName = req.body.componentName?.toString();
    const stackName = req.body.stackName?.toString();

    const stackOutput = await apiClient.deleteStack(stackName);

    const auditResponse = await createRouterAuditRecord({
      actionType: 'Delete Stack',
      actionName: componentName,
      status: stackOutput.$metadata.httpStatusCode == 200 ? 'SUCCESS' : 'FAILED',
      apiClientConfig,
    });
    if (auditResponse.status == 'FAILED') {
      res.status(500).json({ message: 'auditing request FAILED.' });
    }
    res.status(200).json(stackOutput);

  });

  // Route for checking if a file exists in an S3 bucket
  router.post('/s3/doesFileExist', async (req, res) => {
    logger.info('router entry: /s3/doesFileExist');
    const { apiClient } = await getApiClient(req);

    const bucketName = req.body.bucketName?.toString();
    const fileName = req.body.fileName?.toString();

    const stackOutput = await apiClient.doesS3FileExist(bucketName, fileName);
    res.status(200).json(stackOutput);

  });

  return router;
}

type ApiClientConfig = {
  apiClient: AwsAppsApi;
  roleArn: string;
  awsAccount: string;
  awsRegion: string;
  requester: string;
  owner: string;
};
