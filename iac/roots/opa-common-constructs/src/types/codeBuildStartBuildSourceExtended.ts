// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as iam from "aws-cdk-lib/aws-iam";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

/**
 * Properties for CodeBuildStartBuild
 */
export interface CodeBuildStartBuildProps extends sfn.TaskStateBaseProps {
  /**
   * CodeBuild project to start
   */
  readonly project: codebuild.IProject;
  /**
   * A set of environment variables to be used for this build only.
   *
   * @default - the latest environment variables already defined in the build project.
   */
  readonly environmentVariablesOverride?: { [name: string]: codebuild.BuildEnvironmentVariable };
  readonly artifactOverride?: { [key: string]: string | boolean };
  /**
   * Use a string to define a json path
   *
   * @default - the latest environment variables already defined in the build project.
   */
  readonly envVariablesJsonPath?: string;
  readonly sourceLocationOverride?: string;
}

/**
 * Start a CodeBuild Build as a task
 *
 * @see https://docs.aws.amazon.com/step-functions/latest/dg/connect-codebuild.html
 */
export class CodeBuildStartBuildExtended extends sfn.TaskStateBase {
  private static readonly SUPPORTED_INTEGRATION_PATTERNS: sfn.IntegrationPattern[] = [
    sfn.IntegrationPattern.REQUEST_RESPONSE,
    sfn.IntegrationPattern.RUN_JOB,
  ];

  protected readonly taskMetrics?: sfn.TaskMetricsConfig;
  protected readonly taskPolicies?: iam.PolicyStatement[];

  private readonly integrationPattern: sfn.IntegrationPattern;

  constructor(scope: Construct, id: string, private readonly props: CodeBuildStartBuildProps) {
    super(scope, id, props);
    this.integrationPattern = props.integrationPattern ?? sfn.IntegrationPattern.REQUEST_RESPONSE;

    this.validatePatternSupported(this.integrationPattern, CodeBuildStartBuildExtended.SUPPORTED_INTEGRATION_PATTERNS);

    this.taskMetrics = {
      metricPrefixSingular: "CodeBuildProject",
      metricPrefixPlural: "CodeBuildProjects",
      metricDimensions: {
        ProjectArn: this.props.project.projectArn,
      },
    };

    this.taskPolicies = this.configurePolicyStatements();
  }

  private configurePolicyStatements(): iam.PolicyStatement[] {
    let policyStatements = [
      new iam.PolicyStatement({
        resources: [this.props.project.projectArn],
        actions: [
          "codebuild:StartBuild",
          "codebuild:StopBuild",
          "codebuild:BatchGetBuilds",
          "codebuild:BatchGetReports",
        ],
      }),
    ];

    if (this.integrationPattern === sfn.IntegrationPattern.RUN_JOB) {
      policyStatements.push(
        new iam.PolicyStatement({
          actions: ["events:PutTargets", "events:PutRule", "events:DescribeRule"],
          resources: [
            cdk.Stack.of(this).formatArn({
              service: "events",
              resource: "rule/StepFunctionsGetEventForCodeBuildStartBuildRule",
            }),
          ],
        })
      );
    }

    return policyStatements;
  }

  /**
   * Provides the CodeBuild StartBuild service integration task configuration
   */
  /**
   * @internal
   */
  protected _renderTask(): any {
    // If JSON string is set take that value as a string
    let envVars;
    if (this.props.envVariablesJsonPath) {
      envVars = this.props.envVariablesJsonPath;
    } else {
      envVars = this.props.environmentVariablesOverride
        ? this.serializeEnvVariables(this.props.environmentVariablesOverride)
        : undefined;
    }

    return {
      Resource: this.integrationResourceArn("codebuild", "startBuild", this.integrationPattern),
      Parameters: sfn.FieldUtils.renderObject({
        ProjectName: this.props.project.projectName,
        EnvironmentVariablesOverride: envVars,
        ArtifactsOverride: this.props.artifactOverride ? this.props.artifactOverride : undefined,
        SourceLocationOverride: this.props.sourceLocationOverride ? this.props.sourceLocationOverride : undefined,
      }),
    };
  }

  private serializeEnvVariables(environmentVariables: { [name: string]: codebuild.BuildEnvironmentVariable }) {
    return Object.keys(environmentVariables).map((name) => ({
      Name: name,
      Type: environmentVariables[name].type || codebuild.BuildEnvironmentVariableType.PLAINTEXT,
      Value: environmentVariables[name].value,
    }));
  }
  /**
   * Verifies that a validation pattern is supported for a service integration
   *
   */
  validatePatternSupported(integrationPattern: sfn.IntegrationPattern, supportedPatterns: sfn.IntegrationPattern[]) {
    if (!supportedPatterns.includes(integrationPattern)) {
      throw new Error(
        `Unsupported service integration pattern. Supported Patterns: ${supportedPatterns}. Received: ${integrationPattern}`
      );
    }
  }

  /**
   * Suffixes corresponding to different service integration patterns
   *
   * Key is the service integration pattern, value is the resource ARN suffix.
   *
   * @see https://docs.aws.amazon.com/step-functions/latest/dg/connect-to-resource.html
   */
  resourceArnSuffix: Record<sfn.IntegrationPattern, string> = {
    [sfn.IntegrationPattern.REQUEST_RESPONSE]: "",
    [sfn.IntegrationPattern.RUN_JOB]: ".sync",
    [sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN]: ".waitForTaskToken",
  };

  integrationResourceArn(service: string, api: string, integrationPattern?: sfn.IntegrationPattern): string {
    if (!service || !api) {
      throw new Error("Both 'service' and 'api' must be provided to build the resource ARN.");
    }
    return (
      `arn:${cdk.Aws.PARTITION}:states:::${service}:${api}` +
      (integrationPattern ? this.resourceArnSuffix[integrationPattern] : "")
    );
  }
}
