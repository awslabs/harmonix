// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import * as codeBuild from "aws-cdk-lib/aws-codebuild";
import * as dynamoDb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodeJs from "aws-cdk-lib/aws-lambda-nodejs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as stepFunctions from "aws-cdk-lib/aws-stepfunctions";
import * as stepFunctionsTasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import { Construct } from "constructs";
import { CodeBuildStartBuildExtended } from "./types/codeBuildStartBuildSourceExtended";
import { LogGroup } from "aws-cdk-lib/aws-logs";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { OPAEnvironmentParams } from "./opa-environment-params";

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface ProvisioningPipelineConstructProps extends cdk.StackProps {
  readonly opaEnv: OPAEnvironmentParams;
  readonly auditTable: dynamoDb.Table;
  readonly vpc: cdk.aws_ec2.Vpc;
  readonly encryptionKey: kms.IKey;
  readonly accessLogBucket: s3.IBucket;
  readonly gitlabSecretName: string;
  readonly originHostURL: string;
  sourceRepositoryPath?: string;
}

const defaultProps: Partial<ProvisioningPipelineConstructProps> = {};

/**
 * Deploys the ProvisioningPipeline construct
 */
export class ProvisioningPipelineConstruct extends Construct {
  public readonly provisioningPipelineStateMachine: stepFunctions.StateMachine;

  constructor(parent: Construct, name: string, props: ProvisioningPipelineConstructProps) {
    super(parent, name);

    /* eslint-disable @typescript-eslint/no-unused-vars */
    props = { ...defaultProps, ...props };

    const envIdentifier = `${props.opaEnv.prefix.toLowerCase()}-${props.opaEnv.envName}`;
    const envPathIdentifier = `/${props.opaEnv.prefix.toLowerCase()}/${props.opaEnv.envName.toLowerCase()}`;

    if (!props.sourceRepositoryPath)
      props.sourceRepositoryPath = "backstage-reference/backstage-reference.git";

    const gitlabSecret = secretsmanager.Secret.fromSecretNameV2(this, `${envIdentifier}-gitlab-secret`, props.gitlabSecretName);

    const artifactBucket = new s3.Bucket(this, `${envIdentifier}-artifact-bucket`, {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      enforceSSL: true,
      encryptionKey: props.encryptionKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      serverAccessLogsBucket: props.accessLogBucket,
      serverAccessLogsPrefix: 'artifactBucketAccessLogs',
    });

    const artifactBucketPolicyStatement = new iam.PolicyStatement({
      actions: [
        "s3:Abort*",
        "s3:DeleteObject*",
        "s3:GetBucket*",
        "s3:GetObject*",
        "s3:List*",
        "s3:PutObject",
        "s3:PutObjectLegalHold",
        "s3:PutObjectRetention",
        "s3:PutObjectTagging",
        "s3:PutObjectVersionTagging",
      ],
      resources: [artifactBucket.arnForObjects("*"), artifactBucket.bucketArn],
      effect: iam.Effect.ALLOW,
    });

    // ---- Audit Steps ---- //
    const setAuditInProgress = this.generateDynamoUpdateItem(this, props.auditTable, "IN PROGRESS");
    const setAuditSuccess = this.generateDynamoUpdateItem(this, props.auditTable, "SUCCESS");
    const setAuditFailed = this.generateDynamoUpdateItem(this, props.auditTable, "FAILED").next(
      new stepFunctions.Fail(this, "Fail")
    );

    // ---- Serialize Parameters ---- //
    const serializeEnvironmentVariablesFunction = new lambdaNodeJs.NodejsFunction(this, `${envIdentifier}-serialize-env-variables-func`, {
      entry: "./lambda/serializeEnvironmentVariables/serializeEnvironmentVariables.ts",
      runtime: lambda.Runtime.NODEJS_18_X,
    });

    const serializeEnvVariablesStep = new stepFunctionsTasks.LambdaInvoke(this, `${envIdentifier}-serialize-env-invoke`, {
      lambdaFunction: serializeEnvironmentVariablesFunction,
      inputPath: "$.parameters",
      resultPath: "$.SerializedResult",
      resultSelector: {
        serializedEnvironmentalOverrides: stepFunctions.JsonPath.listAt("$.Payload"),
      },
    });

    // ---- Package Boilerplate Steps ---- //

    // ? Should this be a lambda? Takes about 3 min to run, could be done in a few seconds with lambda
    // Pull from gitlab and package boilerplate
    const packageBoilerplateProject = new codeBuild.Project(this, `${envIdentifier}-buildProject`, {
      environment: {
        buildImage: codeBuild.LinuxBuildImage.STANDARD_6_0,
        privileged: true,
        computeType: codeBuild.ComputeType.MEDIUM,
        environmentVariables: {
          HOST_NAME: {
            type: codeBuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: props.originHostURL,
          },
          REPOSITORY_PATH: {
            type: codeBuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: props.sourceRepositoryPath
          }
        },
      },
      vpc: props.vpc,
      encryptionKey: props.encryptionKey,
      buildSpec: codeBuild.BuildSpec.fromObject({
        version: "0.2",
        env: {
          shell: "bash",
          "secrets-manager": {
            GITLAB_TOKEN: `${gitlabSecret.secretArn}:apiToken`,
          },
        },
        phases: {
          build: {
            commands: [
              "echo ====== START Clone Repo =======",
              "git clone https://oauth2:${GITLAB_TOKEN}@git.${HOST_NAME}/${REPOSITORY_PATH}",
              "echo 'Finished Pulling reference repo.'",
            ],
          },
        },
        artifacts: {
          files: ["**/*"],
          "base-directory": "backstage-reference/common/$REPOSITORY",
          name: "$REPOSITORY.zip",
        },
      }),
      artifacts: codeBuild.Artifacts.s3({
        bucket: artifactBucket,
        path: "boilerplates",
        includeBuildId: false,
        packageZip: true,
      }),
      cache: codeBuild.Cache.local(codeBuild.LocalCacheMode.DOCKER_LAYER),
    });
    props.encryptionKey.grantDecrypt(packageBoilerplateProject);
    packageBoilerplateProject.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["secretsmanager:*"],
        // resources: [gitlabSecretArn, `${gitlabSecretArn}:apiToken`],
        // resources: [`arn:aws:secretsmanager:*:${props.config.Account}:secret:*`],
        resources: [`arn:aws:secretsmanager:*:${props.opaEnv.awsAccount}:secret:*`],
      })
    );
    packageBoilerplateProject.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["kms:*"],
        // resources: [gitlabSecretArn, `${gitlabSecretArn}:apiToken`],
        // resources: [`arn:aws:kms:*:${props.config.Account}:key/*`],
        resources: [`arn:aws:kms:*:${props.opaEnv.awsAccount}:key/*`],
      })
    );

    const packageBoilerplateStep = new stepFunctionsTasks.CodeBuildStartBuild(this, `${envIdentifier}-package-boilerplate`, {
      project: packageBoilerplateProject,
      integrationPattern: stepFunctions.IntegrationPattern.RUN_JOB,
      resultPath: "$.Result",
      environmentVariablesOverride: {
        REPOSITORY: {
          type: codeBuild.BuildEnvironmentVariableType.PLAINTEXT,
          value: stepFunctions.JsonPath.stringAt("$.repository"),
        },
      },
    });

    // ---- Deploy Boilerplate Steps ---- //
    const deployCustomCFArtifact = codeBuild.Artifacts.s3({
      bucket: artifactBucket,
      path: "executions",
    });

    // Deploy Boilerplate template code
    const deployCustomCFProject = new codeBuild.Project(this, `${envIdentifier}-deploy-custom-cf-project`, {
      environment: {
        buildImage: codeBuild.LinuxBuildImage.STANDARD_6_0,
        privileged: true,
        computeType: codeBuild.ComputeType.MEDIUM,
      },
      encryptionKey: props.encryptionKey,
      source: codeBuild.Source.s3({
        bucket: artifactBucket,
        path: "boilerplates/",
      }),
      artifacts: deployCustomCFArtifact,
      cache: codeBuild.Cache.local(codeBuild.LocalCacheMode.DOCKER_LAYER),
      timeout: cdk.Duration.hours(6),
    });
    deployCustomCFProject.addToRolePolicy(artifactBucketPolicyStatement);
    deployCustomCFProject.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["sts:AssumeRole"],
        resources: ["arn:aws:iam::*:role/cdk-*"],
      })
    );

    // * We have to use a generic task because stepfucntionstasks startbuild doesnt' support source overrides
    const deployBoilerplateStep = new CodeBuildStartBuildExtended(this, `${envIdentifier}-deploy-boilerplate`, {
      resultPath: "$.Result",
      integrationPattern: stepFunctions.IntegrationPattern.RUN_JOB,
      sourceLocationOverride: stepFunctions.JsonPath.format(
        `${artifactBucket.bucketName}/boilerplates/{}.zip`,
        stepFunctions.JsonPath.stringAt("$.repository")
      ),
      artifactOverride: {
        ArtifactIdentifier: deployCustomCFArtifact.identifier || "",
        Location: artifactBucket.bucketName,
        // Name: stepFunctions.JsonPath.format(`{}.json`, stepFunctions.JsonPath.stringAt("$.repository")),
        NamespaceType: "NONE",
        // packaging: "NONE",
        Name: stepFunctions.JsonPath.stringAt("$.repository"),
        Path: stepFunctions.JsonPath.format(`executions/{}`, stepFunctions.JsonPath.stringAt("$$.Execution.Name")),
        Type: "S3",
      },
      envVariablesJsonPath: stepFunctions.JsonPath.stringAt("$.seralizedEnvironmentVariables"),
      project: deployCustomCFProject,
    });

    // ---- Aggregate Outputs Step ---- //
    const aggregateOutputFunction = new lambdaNodeJs.NodejsFunction(this, `${envIdentifier}-aggregate-output`, {
      entry: "./lambda/aggregateOutput/aggregateOutput.ts",
      environment: {
        S3_BUCKET: artifactBucket.bucketName,
      },
      runtime: lambda.Runtime.NODEJS_16_X,
    });
    artifactBucket.grantRead(aggregateOutputFunction);
    artifactBucket.encryptionKey?.grantDecrypt(aggregateOutputFunction);

    const aggregateOutputStep = new stepFunctionsTasks.LambdaInvoke(this, `${envIdentifier}-aggregate-output`, {
      lambdaFunction: aggregateOutputFunction,
      payload: stepFunctions.TaskInput.fromJsonPathAt("$$.Execution"),
      resultPath: "$.DeploymentOutput",
      resultSelector: {
        outputs: stepFunctions.JsonPath.listAt("$.Payload"),
      },
    });

    // ---- Construct Statemachine ----
    const packageBoilerplateMap = new stepFunctions.Map(this, `${envIdentifier}-package-boilerplate-map`, {
      itemsPath: stepFunctions.JsonPath.stringAt("$.repositories"),
      resultPath: "$.Result",
      parameters: {
        "repository.$": "$$.Map.Item.Value",
      },
    });
    packageBoilerplateMap.iterator(packageBoilerplateStep).addCatch(setAuditFailed, {
      resultPath: stepFunctions.JsonPath.DISCARD,
    });

    const deployBoilerPlateMap = new stepFunctions.Map(this, `${envIdentifier}-deploy-boilerplate-map`, {
      itemsPath: stepFunctions.JsonPath.stringAt("$.repositories"),
      resultPath: "$.Result",
      parameters: {
        "repository.$": "$$.Map.Item.Value",
        seralizedEnvironmentVariables: stepFunctions.JsonPath.listAt(
          "$.SerializedResult.serializedEnvironmentalOverrides"
        ),
      },
    });
    deployBoilerPlateMap.iterator(deployBoilerplateStep).addCatch(setAuditFailed, {
      resultPath: stepFunctions.JsonPath.DISCARD,
    });

    const provisioningPipelineStateMachine = new stepFunctions.StateMachine(this, `${envIdentifier}-provisioningPipelineStateMachine`, {
      // definition: setAuditInProgress.next(deployBoilerPlateMap).next(setAuditSuccess),
      definition: setAuditInProgress
        .next(serializeEnvVariablesStep)
        .next(packageBoilerplateMap)
        .next(deployBoilerPlateMap)
        .next(aggregateOutputStep)
        .next(setAuditSuccess),
      tracingEnabled: true,
      logs: {
        destination: new LogGroup(this, 'provisioningPipelineStateMachineLogs'),
        level: stepFunctions.LogLevel.ALL
      },
    });


    this.provisioningPipelineStateMachine = provisioningPipelineStateMachine;

    // now save the VPC in SSM Param
    const stepFnParam = new ssm.StringParameter(this, `${envIdentifier}-provisioning-step-param`, {
      allowedPattern: ".*",
      description: `The Provisioning Step Function for OPA Solution: ${props.opaEnv.envName} Environment`,
      parameterName: `${envPathIdentifier}/step-function`,
      stringValue: provisioningPipelineStateMachine.stateMachineName,
    });

    // Post params to output
    new cdk.CfnOutput(this, "Provisioning Step Function Param", {
      value: stepFnParam.parameterName,
    });
  }

  generateDynamoUpdateItem(
    scope: Construct,
    auditTable: dynamoDb.Table,
    status: string
  ): stepFunctionsTasks.DynamoPutItem {
    return new stepFunctionsTasks.DynamoPutItem(scope, `Status=${status}`, {
      table: auditTable,
      item: {
        id: stepFunctionsTasks.DynamoAttributeValue.fromString(
          stepFunctions.JsonPath.format(
            `{}#{}#{}#{}#{}`,
            stepFunctions.JsonPath.stringAt("$.parameters.TARGET_ACCOUNT"),
            stepFunctions.JsonPath.stringAt("$.parameters.TARGET_REGION"),
            stepFunctions.JsonPath.stringAt("$.parameters.USER"),
            stepFunctions.JsonPath.stringAt("$.parameters.ACTION_TYPE"),
            stepFunctions.JsonPath.stringAt("$$.State.EnteredTime")
          )
        ),
        origin: stepFunctionsTasks.DynamoAttributeValue.fromString("Step Functions"),
        actionType: stepFunctionsTasks.DynamoAttributeValue.fromString(
          stepFunctions.JsonPath.stringAt("$.parameters.ACTION_TYPE")
        ),
        name: stepFunctionsTasks.DynamoAttributeValue.fromString(
          stepFunctions.JsonPath.stringAt("$.parameters.APP_SHORT_NAME")
        ),
        createdAt: stepFunctionsTasks.DynamoAttributeValue.fromString(
          stepFunctions.JsonPath.stringAt("$$.State.EnteredTime")
        ),
        createdDate: stepFunctionsTasks.DynamoAttributeValue.fromString(
          stepFunctions.JsonPath.stringAt("$$.State.EnteredTime")
        ),
        assumedRole: stepFunctionsTasks.DynamoAttributeValue.fromString(
          stepFunctions.JsonPath.stringAt("$.parameters.ASSUMED_ROLE")
        ),
        targetAccount: stepFunctionsTasks.DynamoAttributeValue.fromString(
          stepFunctions.JsonPath.stringAt("$.parameters.TARGET_ACCOUNT")
        ),
        targetRegion: stepFunctionsTasks.DynamoAttributeValue.fromString(
          stepFunctions.JsonPath.stringAt("$.parameters.TARGET_REGION")
        ),
        //TODO: Update complete request json stringfy here, Opinionated information to catpure from request
        request: stepFunctionsTasks.DynamoAttributeValue.fromString(""),
        owner: stepFunctionsTasks.DynamoAttributeValue.fromString(""), //TODO: Update Onwer of the app
        status: stepFunctionsTasks.DynamoAttributeValue.fromString(status),
        message: stepFunctionsTasks.DynamoAttributeValue.fromString(""), //TODO: Figure how to get message when error occured
        initiatedBy: stepFunctionsTasks.DynamoAttributeValue.fromString(
          stepFunctions.JsonPath.stringAt("$.parameters.USER")
        ),
      },
      returnValues: stepFunctionsTasks.DynamoReturnValues.ALL_OLD,
      resultPath: stepFunctions.JsonPath.DISCARD,
    });

  }
}
