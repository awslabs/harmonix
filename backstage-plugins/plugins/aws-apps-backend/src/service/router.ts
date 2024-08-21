// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  AppPromoParams,
  BindResourceParams,
  GitProviders,
  IRepositoryInfo,
  readOpaAppAuditPermission,
} from '@aws/plugin-aws-apps-common-for-backstage';
import { NotAllowedError } from '@backstage/errors';
import {AuthService, HttpAuthService, LoggerService, PermissionsService, UserInfoService} from '@backstage/backend-plugin-api'
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { createPermissionIntegrationRouter } from '@backstage/plugin-permission-node';
import express from 'express';
import Router from 'express-promise-router';
import YAML from 'yaml';
import { AwsAppsApi, getAWScreds } from '../api';
import { AwsAuditResponse, createAuditRecord } from '../api/aws-audit';
import { AwsAppsPlatformApi } from '../api/aws-platform';
import { Config } from '@backstage/config';
import { CatalogApi } from '@backstage/catalog-client';


export interface RouterOptions {
  config: Config; 
  logger: LoggerService;
  userInfo: UserInfoService;
  catalogApi: CatalogApi;
  permissions: PermissionsService;
  auth: AuthService;
  httpAuth: HttpAuthService;
}

export async function createRouter(options: RouterOptions): Promise<express.Router> {
  const { config, logger, userInfo, catalogApi, permissions, auth, httpAuth} = options;
  
  const permissionIntegrationRouter = createPermissionIntegrationRouter({
    permissions: [readOpaAppAuditPermission]
  });

  const router = Router();

  router.use(permissionIntegrationRouter);

  //Async function to get backend API client
  async function getApiClient(
    req: any,
  ): Promise<{ apiClient: AwsAppsApi; apiClientConfig: ApiClientConfig }> {
    const awsRegion = req.body.awsRegion?.toString();

    const awsAccount = req.body.awsAccount?.toString();
    const prefix = req.body.prefix?.toString();
    const providerName = req.body.providerName?.toString();
    const appName = req.body.appName?.toString();
    if (awsRegion === undefined || awsAccount === undefined || prefix === undefined || providerName === undefined || appName === undefined) {
      throw Error;
    }

    const credentials = await httpAuth.credentials(req);
    const identity = await userInfo.getUserInfo(credentials);

    const creds = await getAWScreds(awsAccount, awsRegion, prefix, providerName, undefined, identity);

    const roleArn = creds.roleArn;

    const apiClient = new AwsAppsApi(logger, creds.credentials, awsRegion, awsAccount);
   
    const requester = identity?.userEntityRef.split('/')[1] || '';

    const owner = creds.owner ?? '';

    return { apiClient, apiClientConfig: { apiClient, roleArn, awsAccount, awsRegion, requester, owner, prefix, providerName, appName } };
  }

  function getAwsAppsPlatformApi(req: any): AwsAppsPlatformApi {
    const awsRegion = req.body.awsRegion?.toString();
    const awsAccount = req.body.awsAccount?.toString();

    const platformRegion = process.env.AWS_REGION || config.getString('backend.platformRegion');
    const repoInfo: IRepositoryInfo = req.body.repoInfo;
    if (awsRegion === undefined || awsAccount === undefined) {
      throw new Error('getAwsAppsPlatformApi: awsRegion or awsAccount is undefined');
    }
    if (repoInfo === undefined) {
      return new AwsAppsPlatformApi(logger, platformRegion, awsRegion, awsAccount, GitProviders.UNSET);
    }
    return new AwsAppsPlatformApi(logger, platformRegion, awsRegion, awsAccount, repoInfo.gitProvider);
  }

  function getCloudFormationStackParams(req: any) {
    return {
      // Required params
      componentName: req.body.componentName?.toString(),
      stackName: req.body.stackName?.toString(),
      s3BucketName: req.body.s3BucketName?.toString(),
      cfFileName: req.body.cfFileName?.toString(),
      providerName: req.body.providerName?.toString(),

      // Params needed if CloudFormation stack input parameters should be retrieved
      envName: req.body.environmentName?.toString(),
    };
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
      appName: apiClientConfig.appName,
      apiClient: apiClientConfig.apiClient,
      roleArn: apiClientConfig.roleArn,
      awsAccount: apiClientConfig.awsAccount,
      awsRegion: apiClientConfig.awsRegion,
      logger,
      requester: apiClientConfig.requester,
      status,
      owner: apiClientConfig.owner,
      envProviderName: apiClientConfig.providerName,
      envProviderPrefix: apiClientConfig.prefix
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

  // Route for fetching platform secrets - no provider
  router.post('/platform/secrets', async (req, res) => {
    logger.info('router entry: /platform/secrets');
    const apiPlatformClient = getAwsAppsPlatformApi(req);
    const secretArn = req.body.secretArn?.toString();
    const service = await apiPlatformClient.getPlatformSecretValue(secretArn);

    const status = service.$metadata.httpStatusCode == 200 ? 'SUCCESS' : 'FAILED';
    if (status == 'FAILED') res.status(500).json({ message: 'FAILED fetching platform secret request .' });

    res.status(200).json(service);
  });

  // Route for fetching platform SSM param - no provider
  router.post('/platform/ssm', async (req, res) => {
    logger.info('router entry: /platform/ssm');
    const apiPlatformClient = getAwsAppsPlatformApi(req);
    const paramName = req.body.paramName?.toString();
    const service = await apiPlatformClient.getSsmValue(paramName);
    const status = service.$metadata.httpStatusCode == 200 ? 'SUCCESS' : 'FAILED';
    if (status == 'FAILED') res.status(500).json({ message: 'FAILED fetching platform param request .' });
    res.status(200).json(service);
  });

  router.post('/platform/delete-tf-provider', async (req, res) => {
    logger.info('router entry: platform/delete-tf-provider');
    const apiPlatformClient = getAwsAppsPlatformApi(req);
    const providerName = req.body.providerName?.toString();
    const repoInfo: IRepositoryInfo = req.body.repoInfo;
    const gitAdminSecret = req.body.gitAdminSecret?.toString();
    const envName = req.body.envName?.toString();

    const service = await apiPlatformClient.deleteTFProvider(envName, providerName, repoInfo, gitAdminSecret);
    const status = service.status === "SUCCESS" ? 'SUCCESS' : 'FAILED';
    if (status == 'FAILED') res.status(500).json({ message: 'FAILED Destroy TF Provider request .' });
    res.status(200).json(service);
  });

  router.post('/platform/delete-secret', async (req, res) => {
    logger.info('router entry: /platform/delete-secret');
    const apiPlatformClient = getAwsAppsPlatformApi(req);
    const secretName = req.body.secretName?.toString();
    const service = await apiPlatformClient.deletePlatformSecret(secretName);
    const status = service.$metadata.httpStatusCode == 200 ? 'SUCCESS' : 'FAILED';
    if (status == 'FAILED') res.status(500).json({ message: 'FAILED /platform/delete-secret .' });
    res.status(200).json(service);
  });

  router.post('/platform/delete-repository', async (req, res) => {
    logger.info('router entry: platform/delete-repository');
    const apiPlatformClient = getAwsAppsPlatformApi(req);
    const repoInfo: IRepositoryInfo = req.body.repoInfo;
    const gitAdminSecret = req.body.gitAdminSecret?.toString();
    const service = await apiPlatformClient.deleteRepository(repoInfo, gitAdminSecret);
    console.log(service)
    const status = service.isSuccuess ? 'SUCCESS' : 'FAILED';
    if (status == 'FAILED') res.status(500).json({ message: 'FAILED fetching platform param request .' });
    res.status(200).json(service);
  });

  //Route to promote app to git job
  router.post('/git/promote', async (req, res) => {
    logger.info('router entry: git/promote');
    const apiPlatformClient = getAwsAppsPlatformApi(req);

    const secretName = req.body.gitAdminSecret?.toString();
    const appName = req.body.appName?.toString();
    const envName = req.body.envName?.toString();
    const envRequiresManualApproval = req.body.envRequiresManualApproval?.toString();
    const repoInfo: IRepositoryInfo = req.body.repoInfo;

    const providers = req.body.providers;
    const params: AppPromoParams = {
      envName,
      envRequiresManualApproval,
      appName,
      providers
    };
    // console.log(params)
    const results = await apiPlatformClient.promoteAppToGit(params, repoInfo, secretName);
    console.log(results)
    res.status(200).json(results);
  });

  //Route to Bind app to resource using git job
  router.post('/platform/bind-resource', async (req, res) => {
    logger.info('router entry: /platform/bind-resource');
    const apiPlatformClient = getAwsAppsPlatformApi(req);

    const secretName = req.body.gitAdminSecret?.toString();
    const appName = req.body.appName?.toString();
    const envName = req.body.envName?.toString();
    const providerName = req.body.providerName?.toString();

    const repoInfo: IRepositoryInfo = req.body.repoInfo;
    const resourceName = req.body.resourceName?.toString();
    const resourceEntityRef = req.body.resourceEntityRef?.toString();
    const policies = req.body.policies;
    const params: BindResourceParams = {
      envName,
      appName,
      providerName,
      resourceName,
      resourceEntityRef,
      policies
    };
    // console.log(params)
    const results = await apiPlatformClient.bindResource(repoInfo,params, secretName);
    console.log(results)
    res.status(200).json(results);
  });

  //Route to unBind app to resource using git job
  router.post('/platform/unbind-resource', async (req, res) => {
    logger.info('router entry: /platform/unbind-resource');
    const apiPlatformClient = getAwsAppsPlatformApi(req);

    const secretName = req.body.gitAdminSecret?.toString();
    const appName = req.body.appName?.toString();
    const envName = req.body.envName?.toString();
    const providerName = req.body.providerName?.toString();

    const repoInfo: IRepositoryInfo = req.body.repoInfo;
    const resourceName = req.body.resourceName?.toString();
    const resourceEntityRef = req.body.resourceEntityRef?.toString();
    const policies = req.body.policies;
    const params: BindResourceParams = {
      envName,
      appName,
      providerName,
      resourceName,
      resourceEntityRef,
      policies
    };
    // console.log(params)
    const results = await apiPlatformClient.unBindResource(repoInfo, params, secretName);
    console.log(results)
    res.status(200).json(results);
  });

  //Route to add provider to environment using git
  router.post('/platform/update-provider', async (req, res) => {
    logger.info('router entry: /platform/update-provider');
    const apiPlatformClient = getAwsAppsPlatformApi(req);
    const secretName = req.body.gitAdminSecret?.toString();
    const envName = req.body.envName?.toString();
    const provider = req.body.provider;
    const repoInfo: IRepositoryInfo = req.body.repoInfo;
    const action = req.body.action?.toString();
    console.log(secretName)
    // const filePath = encodeURIComponent(`.backstage/catalog-info.yaml`);
    let filePath= "";
    if (repoInfo.gitProvider===GitProviders.GITLAB)
    {
        filePath = encodeURIComponent(`.backstage/catalog-info.yaml`);
    }
    else if (repoInfo.gitProvider===GitProviders.GITHUB)
    {
        filePath = ".backstage/catalog-info.yaml";
    }
    
    logger.info(`fetching environment entity file path is ${filePath}`);
    // get the file from the repo
    const paramsResponse = await apiPlatformClient.getFileContentsFromGit(repoInfo, filePath, secretName);
    // console.log(paramsResponse)
    const entityCatalog = YAML.parse(paramsResponse);

    const results = await apiPlatformClient.updateProvider(envName, provider, repoInfo, entityCatalog, action, secretName);
    console.log(results)
    res.status(200).json(results);
  });

  // API to update git JSON / Yaml config files
  router.post('/platform/fetch-eks-config', async (req, res) => {
    logger.info('router entry: /platform/fetch-eks-config');
    console.log(req.body)
    const apiPlatformClient = getAwsAppsPlatformApi(req);
    const secretName = req.body.gitAdminSecret?.toString();
    const envName = req.body.envName?.toString();
    const providerName = req.body.providerName;
    const repoInfo: IRepositoryInfo = req.body.repoInfo;

    const filePath = encodeURIComponent(`k8s/${envName}-${providerName}/next-release.json`);
    logger.info(`fetching environment entity file path is ${filePath}`);
    // get the JSON file from the repo
    const jsonResponse = await apiPlatformClient.getFileContentsFromGit(repoInfo, filePath, secretName);
    const configJson = JSON.parse(atob(jsonResponse))
    res.status(200).json(configJson);
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
    let status = ""

    if (serviceResult.$metadata.httpStatusCode === 200) {
      status = 'SUCCESS'
    } else {
      status = 'FAILED'
      console.error(`Failed fetching ${ssmParamName} on client ${apiClientConfig}`)
    }

    const auditResponse = await createRouterAuditRecord({
      actionType: 'Fetch SSM Param',
      actionName: ssmParamName,
      status,
      apiClientConfig,
    });

    if (auditResponse.status === 'FAILED') {
      res.status(500).json({ message: 'auditing request FAILED.' });
    }
    else {
      res.status(200).json(serviceResult);
    }
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
      return { ...td, name: envVar[index].containerName, environment: envVar[index].env }
    });

    const newTd = {...oldTaskDefinition.taskDefinition, containerDefinitions: newCd };
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

  // Route for getting Audit table entries
  router.post('/audit-entries', async (req, res) => {
    logger.info('router entry: /audit-entries');
    // TODO: Validate migrated Code
    const credentials = await httpAuth.credentials(req, { allow: ['user'] });
    
    
    // OLD code
    // const token = getBearerTokenFromAuthorizationHeader(req.header('authorization'));

    // // get a permission decision
    // const decision = (
    //   await permissions.authorize([{
    //     permission: readOpaAppAuditPermission
    //   }], {
    //     token
    //   })
    // )

    // Additional actions **Optional** :
    const { token } = await auth.getPluginRequestToken({
      onBehalfOf: credentials,
      targetPluginId: 'catalog',
    });
    // get user entity and check more conditions

    const creds = await httpAuth.credentials(req);
    const identity = await userInfo.getUserInfo(creds);

    const entity = await catalogApi.getEntityByRef(identity.userEntityRef, {
      token,
    });
    console.log(`Hello there: ${entity?.metadata.name}`)

    const decision = await permissions.authorize(
      [{ permission: readOpaAppAuditPermission }],
      { credentials },
    );

    if (decision[0].result === AuthorizeResult.DENY) {
      throw new NotAllowedError('Unauthorized');
    }



    const { apiClient, apiClientConfig } = await getApiClient(req);
    const appName = req.body.appName?.toString();
    const auditTableParam = `/${apiClientConfig.prefix}/${apiClientConfig.providerName}/${apiClientConfig.providerName}-audit`;
    const auditTableName = await apiClient.getSSMParameter(auditTableParam);
    if (auditTableName.Parameter?.Value) {
      const results = await apiClient.getDynamodbTable(auditTableName.Parameter?.Value, appName, 1);

      const auditResponse = await createRouterAuditRecord({
        actionType: 'Get Audit Table',
        actionName: appName,
        status: results.$metadata.httpStatusCode == 200 ? 'SUCCESS' : 'FAILED',
        apiClientConfig,
      });
      if (auditResponse.status == 'FAILED') res.status(500).json({ message: 'auditing request FAILED.' });
      res.status(200).json(results);
    } else {
      res.status(400).send({
        error: 'Cant fetch audit table name',
      });
    }
  });

  //Route for quering a dynamoDB table
  router.post('/dynamo-db/query', async (req, res) => {
    logger.info('router entry: /dynamo-db/query');
    const { apiClient, apiClientConfig } = await getApiClient(req);
    const appName = req.body.appName?.toString();
    const tableName = req.body.tableName?.toString();

    const results = await apiClient.getDynamodbTable(tableName, appName, 1);

    const auditResponse = await createRouterAuditRecord({
      actionType: 'Query DynamoDb Table',
      actionName: appName,
      status: results.$metadata.httpStatusCode == 200 ? 'SUCCESS' : 'FAILED',
      apiClientConfig,
    });
    if (auditResponse.status == 'FAILED') res.status(500).json({ message: 'auditing request FAILED.' });

    res.status(200).json(results);
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
    const {
      componentName, stackName, s3BucketName, cfFileName, providerName,
      envName
    } = getCloudFormationStackParams(req);
    const gitSecretName = req.body.gitAdminSecret?.toString();
    const repoInfo: IRepositoryInfo = req.body.repoInfo;
    const filePath = encodeURIComponent(`.awsdeployment/stackparams/${envName}-${providerName}.json`);
    logger.info(`CloudFormation params file path is ${filePath}`);

    const apiPlatformClient = getAwsAppsPlatformApi(req);

    // CloudFormation stack parameters can be set as a file in the Git repo.
    let parameters: { ParameterKey: string, ParameterValue: any }[] | undefined;
    if (repoInfo.gitHost) {
      const paramsResponse = await apiPlatformClient.getFileContentsFromGit(repoInfo, filePath, gitSecretName);
      parameters = JSON.parse(atob(paramsResponse));

      const params = parameters!.reduce((prevVal, currVal) => `${prevVal} "${currVal.ParameterKey}=${currVal.ParameterValue}"`, '').trim();
      logger.info(`CloudFormation parameter overrides: ${params}`);
    }

    const stackOutput = await apiClient.updateStack(componentName, stackName, s3BucketName, cfFileName, providerName, parameters);

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
    const {
      componentName, stackName, s3BucketName, cfFileName, providerName,
      envName
    } = getCloudFormationStackParams(req);
    const repoInfo: IRepositoryInfo = req.body.repoInfo;
    const gitSecretName = req.body.gitAdminSecret?.toString();
    const filePath = encodeURIComponent(`.awsdeployment/stackparams/${envName}-${providerName}.json`);
    logger.info(`CloudFormation params file path is ${filePath}`);

    const apiPlatformClient = getAwsAppsPlatformApi(req);

    // CloudFormation stack parameters can be set as a file in the Git repo.
    let parameters: { ParameterKey: string, ParameterValue: any }[] | undefined;
    if (repoInfo.gitHost) {
      const paramsResponse = await apiPlatformClient.getFileContentsFromGit(repoInfo, filePath, gitSecretName);
      parameters = JSON.parse(atob(paramsResponse));

      const params = parameters!.reduce((prevVal, currVal) => `${prevVal} "${currVal.ParameterKey}=${currVal.ParameterValue}"`, '').trim();
      logger.info(`CloudFormation parameter overrides: ${params}`);
    }

    const stackOutput = await apiClient.createStack(componentName, stackName, s3BucketName, cfFileName, providerName, parameters);

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

  // Route for interacting with lambda 
  router.post('/lambda/invoke', async (req, res) => {
    logger.info('router entry: /lambda/invoke');
    const { apiClient, apiClientConfig } = await getApiClient(req);
    const functionName = req.body.functionName?.toString();
    const actionDescription = req.body.actionDescription?.toString() || '';
    const body = req.body.body?.toString();
    const lambdaOutput = await apiClient.callLambda(functionName, body);

    if (actionDescription) {
      const auditResponse = await createRouterAuditRecord({
        actionType: 'Invoke Lambda',
        actionName: actionDescription,
        status: lambdaOutput.StatusCode == 200 ? 'SUCCESS' : 'FAILED',
        apiClientConfig,
      });
      if (auditResponse.status == 'FAILED') res.status(500).json({ message: 'auditing request FAILED.' });
    }

    if (lambdaOutput.StatusCode == 200) {
      res.status(200).send(lambdaOutput);
    } else {
      res.status(400).send({
        error: `Error calling ${functionName}`,
      });
    }

  });

  return router;
}

type ApiClientConfig = {
  apiClient: AwsAppsApi;
  roleArn: string;
  awsAccount: string;
  awsRegion: string;
  prefix: string;
  providerName: string;
  appName: string;
  requester: string;
  owner: string;
};
