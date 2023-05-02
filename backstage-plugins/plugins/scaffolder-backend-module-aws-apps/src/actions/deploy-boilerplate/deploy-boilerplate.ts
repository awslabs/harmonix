// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  DescribeExecutionCommand,
  DescribeExecutionCommandOutput,
  ExecutionStatus,
  GetExecutionHistoryCommand,
  GetExecutionHistoryCommandOutput,
  HistoryEvent,
  SFNClient,
  StartExecutionCommand,
} from '@aws-sdk/client-sfn';
import { CatalogApi } from '@backstage/catalog-client';
import { Entity, EntityRelation, RELATION_DEPENDENCY_OF } from '@backstage/catalog-model';
import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { capitalize, kebabCase } from 'lodash';
import yaml from 'yaml';
import { getAWScreds } from '@aws/plugin-aws-apps-backend';
import winston from 'winston';
import { getSSMParameterValue } from '../../helpers/action-context';

const ID = 'baws:deploy-boilerplate';

const examples = [
  {
    description: 'Deploy AWS resources through boilerplate templates',
    example: yaml.stringify({
      steps: [
        {
          action: ID,
          id: 'deployAWSBoilerplate',
          name: 'Deploy AWS Boilerplate',
          input: {
            environmentRef: 'awsenvironment:Test-Environment',
            boilerplateRepositories: ['boilerplate1', 'boilerplate2'],
            inputParameters: {
              owner: 'user:default/johndoe',
              VAR1: 'var1Value',
              VAR2: 'var2VAlue',
              AWS_RESOURCE_TAGS: [
                { Key: "CostCenter", Value: "HR-1234" },
              ],
            },
            actionType: 'Create App',
          },
        },
      ],
    }),
  },
];

interface DeploymentParameters {
  envName: string;
  envProviderName: string;
  accountId: string;
  region: string;
  ssmPathVpc: string;
  ssmPathEcsCluster: string;
}

interface StepFunctionMonitoringInfo {
  status: string | undefined;
  executionDetails: DescribeExecutionCommandOutput;
}

export function createBawsDeployBoilerplateAction(options: { catalogClient: CatalogApi }) {
  const { catalogClient } = options;

  return createTemplateAction<{
    environmentRef: string;
    inputParameters: Record<string, string>;
    boilerplateRepositories: string[];
    actionType: string;
  }>({
    id: ID,
    description: 'Invokes AWS Step Function to deploy AWS resources',
    examples,
    schema: {
      input: {
        required: ['boilerplateRepositories', 'environmentRef', 'actionType'],
        type: 'object',
        properties: {
          environmentRef: {
            type: 'string',
            title: 'Entity reference',
            description: 'The entity reference identifier for an AWS Environment',
          },
          boilerplateRepositories: {
            type: 'array',
            title: 'Repository identifiers',
            description: 'Repository identifiers containing CodeBuild buildspec.yml files',
            items: {
              type: 'string',
            },
          },
          inputParameters: {
            type: 'object',
            title: 'Input Parameters',
            description: 'key/value pairs to pass as input parameters to the stepfunction boilerplates',
          },
          actionType: {
            type: 'string',
            title: 'Action Type',
            description: 'The action of which the pipeline needs to create',
          },
        },
      },
      output: {
        type: 'object',
        properties: {
          account: {
            title: 'The AWS account where infrastructure was deployed',
            type: 'string',
          },
          region: {
            title: 'The AWS region where infrastructure was deployed',
            type: 'string',
          },
          vpcId: {
            title: 'The VPC identifier where infrastructure was deployed',
            type: 'string',
          },
          ecsClusterArn: {
            title: 'The Arn of the ECS cluster where the service and task are deployed',
            type: 'string',
          },
          executionArn: {
            title: 'The Arn of the Step Function used when deploying AWS resources',
            type: 'string',
          },
          startDate: {
            title: 'The date and time when the Step Function pipeline was started',
            type: 'string',
          },
          cfnOutputs: {
            title:
              'The output values from the infrastructure deployment code. ' +
              'This is an object containing keys and values for the deployed resources. ' +
              '(e.g. "{ resourceArn: "arn:aws:ecr:region:acct:resourcetype")',
            type: 'object',
          },
        },
      },
    },
    async handler(ctx) {
      const { environmentRef, boilerplateRepositories, inputParameters, actionType } = ctx.input;
      const token = ctx.secrets?.backstageToken;

      ctx.logger.debug(`environmentRef: ${environmentRef}`);
      ctx.logger.debug(`boilerplateRepositories: ${JSON.stringify(boilerplateRepositories)}`);
      ctx.logger.debug(`input: ${JSON.stringify(inputParameters)}`);

      // Fail early if there is no user entity
      if (ctx.user?.entity === undefined) {
        ctx.logger.info(`No user context provided for ${ID} action`);
        return;
      }

      const awsEnvEntity = await catalogClient.getEntityByRef(environmentRef, { token });
      if (awsEnvEntity === undefined) {
        throw new Error(`The environment entity "${environmentRef}" could not be located in the catalog.`);
      }

      const deploymentParametersArray = await getEnvDeploymentParameters(awsEnvEntity);
      ctx.logger.debug(`envProviders info: ${JSON.stringify(deploymentParametersArray, null, 2)}`);

      // TODO: commenting out the loop since multi-account/multi-region is not yet supported.  There will be only one environment Provider for the prototype.
      // for (const parms of deploymentParametersArray) {
      // const params = deploymentParametersArray[0];
      const { accountId, region, ssmPathVpc, ssmPathEcsCluster, envName, envProviderName } = deploymentParametersArray[0];

      // Get AWS credentials for invoking deployment via StepFunctions
      ctx.logger.info(`Getting credentials for AWS deployment to account ${accountId} in ${region}`);
      const { credentials, roleArn } = await getAWScreds(accountId, region, ctx.user!.entity!);
      const userName = ctx.user.entity.metadata.name;

      // add the deployment parameters to the inputParameters for the StepFunction pipeline state machine
      ctx.logger.info(`Getting infrastructure details for AWS environment ${environmentRef}`);
      const deploymentParameters = {
        TARGET_REGION: region,
        TARGET_ACCOUNT: accountId,
        TARGET_VPCID: await getSSMParameterValue(region, credentials, ssmPathVpc, ctx.logger),
        TARGET_ECS_CLUSTER_ARN: await getSSMParameterValue(region, credentials, ssmPathEcsCluster, ctx.logger),
        TARGET_ENV_NAME: envName,
        TARGET_ENV_PROVIDER_NAME: envProviderName,
        USER: userName,
        ASSUMED_ROLE: roleArn,
        ACTION_TYPE: actionType,
      };
      ctx.logger.debug(`Resolved deployment parameters: ${JSON.stringify(deploymentParameters)}`);

      // Ensure that all input parameters are Record<string,string> objects as expected by StepFunctions input
      for (const [k, v] of Object.entries(inputParameters)) {
        if (typeof v !== 'string') {
          inputParameters[k] = JSON.stringify(v);
        }
      }

      // Get the SSM parameter value which specifiying the StepFunction pipeline
      ctx.logger.info(`Getting provisioning pipeline for AWS boilerplate infrastructure`);
      const stateMachineArn = await getSSMParameterValue(region, credentials, '/baws/pipelineStateMachine/arn', ctx.logger);

      // Get a StepFunction client and invoke it
      ctx.logger.info(
        `Preparing deployment of AWS boilerplate infrastructure to ${accountId} in account ${region}`,
      );
      const sfnClient = new SFNClient({
        region,
        customUserAgent: 'baws-plugin',
        credentials,
      });

      // ToDo - Future enhancement: StepFunction input should be specific to an environment provider
      const sfnInput = {
        repositories: boilerplateRepositories,
        parameters: { ...deploymentParameters, ...inputParameters },
      };
      const sfnCommand = new StartExecutionCommand({
        stateMachineArn,
        input: JSON.stringify(sfnInput),
      });
      ctx.logger.info(`Starting deployment of AWS boilerplate infrastructure.  Deployment may take several minutes.`);
      const sfnResponse = await sfnClient.send(sfnCommand);
      const executionArn = sfnResponse.executionArn;
      if (executionArn === undefined) {
        throw new Error('An unknown error occurred starting the Step Function.');
      }
      ctx.logger.debug(`SFN RESP: ${JSON.stringify(sfnResponse)}`);

      // Check status of the state machine and loop until it is no longer in RUNNING state
      let { status, executionDetails } = await monitorExecution(sfnClient, executionArn, ctx.logger);

      ctx.logger.info(`AWS boilerplate deployment completed with status: ${status}`);
      if (status !== ExecutionStatus.SUCCEEDED) {
        // throw an error so that the scaffolder template stops processing steps
        throw new Error(
          `${ID} action failed to successfully execute the boilerplate(s).  See the output for StepFunction arn for more details: ${executionArn}`,
        );
      }

      // Get the CFN Output parameters and return them in ctx.output
      //
      // The executionDetails.output.DeploymentOutput object has a shape like:
      // 1. "outputs": [
      // 2.     { "bpName1": {
      // 3.            "cfnExecutionId": {
      // 4.                "cfnOutputName": "cfnOutputValue",
      // 5.                ...
      // 6.            }
      // 7.         }
      // 8.     },
      // 9.     { "bpName2": ...}
      // 10.]
      const boilerplateOutputs: Record<string, string> = {};
      if (executionDetails.output) {
        const deploymentOutput = JSON.parse(executionDetails.output).DeploymentOutput;
        deploymentOutput.outputs.forEach((output: Record<string, string>) => {
          for (const cfnExecution of Object.values(output)) {
            for (const cfnOutputs of Object.values(cfnExecution)) {
              for (const [cfnOutputName, cfnOutputValue] of Object.entries(cfnOutputs)) {
                if (cfnOutputName.startsWith('baws')) {
                  boilerplateOutputs[kebabCase(cfnOutputName)] = cfnOutputValue;
                }
              }
            }
          }
        });
      }
      ctx.logger.debug(`cfnOutputs: ${JSON.stringify(boilerplateOutputs, null, 2)}`);

      // Return details about the target AWS Environment
      ctx.output('account', accountId);
      ctx.output('region', region);
      ctx.output('ecsClusterArn', deploymentParameters.TARGET_ECS_CLUSTER_ARN);

      // Return an object of Record<key,value> values as outputs from the boilerplates
      ctx.output('cfnOutputs', boilerplateOutputs);

      // Return details about the StepFunction deployment execution
      ctx.output('executionArn', executionArn);
      ctx.output('startDate', sfnResponse.startDate ? sfnResponse.startDate.toLocaleString() : 'unknown start date');

      // For a given AWS Environment entity, get the defined attributes required for a deployment to AWS
      async function getEnvDeploymentParameters(envEntity: Entity): Promise<DeploymentParameters[]> {
        const entityRelations: EntityRelation[] = envEntity?.relations ?? [];
        const envProvRefs: string[] = entityRelations
          .filter(
            envProvRel =>
              envProvRel.type === RELATION_DEPENDENCY_OF && envProvRel.targetRef.startsWith('awsenvironmentprovider'),
          )
          .map(envProvRel => envProvRel.targetRef);

        const envProviderEntities = await catalogClient.getEntitiesByRefs({ entityRefs: envProvRefs }, { token });

        const deploymentParams: DeploymentParameters[] = envProviderEntities.items
          .filter(
            entity =>
              entity &&
              ['name', 'aws-account', 'aws-region', 'vpc', 'cluster-name'].every(key => key in entity.metadata),
          )
          .map(entity => {
            const { metadata } = entity!;
            return {
              envName: envEntity.metadata.name,
              envProviderName: metadata.name,
              accountId: metadata['aws-account']?.toString(),
              region: metadata['aws-region']?.toString(),
              ssmPathVpc: metadata.vpc?.toString(),
              ssmPathEcsCluster: metadata['cluster-name']?.toString(),
            } as DeploymentParameters;
          });

        return deploymentParams;
      }
    },
  });

  async function monitorExecution(sfnClient: SFNClient, executionArn: string | undefined, logger: winston.Logger): Promise<StepFunctionMonitoringInfo> {
    let status: string | undefined = ExecutionStatus.RUNNING;
    let executionDetails: DescribeExecutionCommandOutput;
    let index = 1;
    let eventHistoryDetails: GetExecutionHistoryCommandOutput;
    let currentEvent: HistoryEvent | undefined;
    let currentEventId = 0;
    let previousEventId = 0;
    let eventType: string = '';
    let numProgressChars = 0;
    do {
      executionDetails = await sfnClient.send(new DescribeExecutionCommand({ executionArn }));
      status = executionDetails.status;
      if (status === undefined) {
        throw new Error(`Execution status for state machine '${executionArn} cannot be determined.`);
      }

      eventHistoryDetails = await sfnClient.send(new GetExecutionHistoryCommand({ executionArn, maxResults: 30 }));
      if (eventHistoryDetails.events?.length) {
        const numAvailableEvents = eventHistoryDetails.events.length;

        currentEvent =
          eventHistoryDetails.events.length > 0 ? eventHistoryDetails.events[numAvailableEvents - 1] : undefined;
        currentEventId = currentEvent?.id ?? currentEventId;
        eventType = currentEvent?.type ?? '';

        if (currentEventId > previousEventId) {
          // print all event histories since the last event id
          numProgressChars = 0; // reset progress indicator since we have some new history to print
          const numEventsToPrint = Math.min(currentEventId - previousEventId, numAvailableEvents);
          for (let i = numAvailableEvents - numEventsToPrint; i < numAvailableEvents; i++) {
            const event = eventHistoryDetails.events[i];
            eventType = event.type ?? eventType;
            logger.info(`${capitalize(status)} step ${event.id}: ${eventType}`);
            await new Promise(resolve => setTimeout(resolve, 10)); // slow down log push loop so that they are more likely to appear in order in the UI
          }
          previousEventId = currentEventId;
        }
      }

      if (status === ExecutionStatus.RUNNING) {
        // if we're still running, wait 3 seconds before continuing the while loop
        await new Promise(resolve => setTimeout(resolve, 3000));

        if (index % 15 === 0) {
          // provide a status update every 45 seconds or if the event id has changed
          numProgressChars++;
          logger.info(
            `${capitalize(status)} step ${currentEventId}: ${eventType}${'.'.repeat(numProgressChars)}`
          );
        }
      }
      index++;
    } while (status === ExecutionStatus.RUNNING);
    return { status, executionDetails };
  }

}
