// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Populate Git service / host info and any CICD pipeline connection info into Systems Manager Parameter Store 
// so that it can be referenced elsewhere. Do not use this construct for creating secrets. Use build-script/secure-secrets-creation.sh
// for creating secrets. This construct can lookup secrets but not create them. 

import { OPAEnvironmentParams } from "@aws/aws-app-development-common-constructs";
import * as cdk from "aws-cdk-lib";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as kms from "aws-cdk-lib/aws-kms";
import { Construct } from "constructs";

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface ScmAndPipelineInfoConstructProps extends cdk.StackProps {
    readonly opaEnv: OPAEnvironmentParams;

    /**
     * The GitHub Hostname for OPA Platform
     */
    readonly githubHostName?: string;

    /**
     * The GitHub URL for OPA Platform
     */
    readonly githubUrl?: string;

    /**
     * The GitLab Hostname for OPA Platform
     */
    readonly gitlabHostName?: string;

    /**
     * The GitLab URL for OPA Platform
     */
    readonly gitlabUrl?: string;

    /**
     * Encryption key
     */
    readonly key: kms.Key
}

const defaultProps: Partial<ScmAndPipelineInfoConstructProps> = {};

/**
 * Deploys the ScmAndPipelineInfoConstruct construct
 */
export class ScmAndPipelineInfoConstruct extends Construct {
    readonly githubHostNameParam?: ssm.StringParameter;
    readonly githubUrlParam?: ssm.StringParameter;
    readonly githubSecret?: secretsmanager.ISecret;
    readonly gitlabHostNameParam?: ssm.StringParameter;
    readonly gitlabUrlParam?: ssm.StringParameter;
    readonly gitlabSecret?: secretsmanager.ISecret;

    constructor(parent: Construct, name: string, props: ScmAndPipelineInfoConstructProps) {
        super(parent, name);

        /* eslint-disable @typescript-eslint/no-unused-vars */
        props = { ...defaultProps, ...props };

        if (props.githubHostName) {
            this.githubHostNameParam = new ssm.StringParameter(this, `${props.opaEnv.prefix}-github-hostname`, {
                allowedPattern: ".*",
                description: `The GitHub Hostname for OPA Platform`,
                parameterName: `/${props.opaEnv.prefix}/github-hostname`,
                stringValue: props.githubHostName,
            });

            new cdk.CfnOutput(this, `GitHub Domain Name Param`, {
                value: this.githubHostNameParam.parameterName,
            });
        }

        if (props.githubUrl) {
            this.githubUrlParam = new ssm.StringParameter(this, `${props.opaEnv.prefix}-github-url`, {
                allowedPattern: ".*",
                description: `The GitHub URL for OPA Platform`,
                parameterName: `/${props.opaEnv.prefix}/github-url`,
                stringValue: props.githubUrl,
            });


            new cdk.CfnOutput(this, `GitHub URL Param`, {
                value: this.githubUrlParam.parameterName,
            });
        }

        // Lookup secret created by build-script/secure-secrets-creation.sh
        if (process.env.GITHUB_SECRET_NAME) {
            this.gitlabSecret = secretsmanager.Secret.fromSecretNameV2(this, `${props.opaEnv.prefix}-key-github-admin-secrets`, process.env.GITHUB_SECRET_NAME);
        }

        if (props.gitlabHostName) {
            this.gitlabHostNameParam = new ssm.StringParameter(this, `${props.opaEnv.prefix}-gitlab-hostname`, {
                allowedPattern: ".*",
                description: `The GitLab Hostname for OPA Platform`,
                parameterName: `/${props.opaEnv.prefix}/gitlab-hostname`,
                stringValue: props.gitlabHostName,
            });

            new cdk.CfnOutput(this, `GitLab Domain Name Param`, {
                value: this.gitlabHostNameParam.parameterName,
            });
        }

        if (props.gitlabUrl) {
            this.gitlabUrlParam = new ssm.StringParameter(this, `${props.opaEnv.prefix}-gitlab-url`, {
                allowedPattern: ".*",
                description: `The GitLab URL for OPA Platform`,
                parameterName: `/${props.opaEnv.prefix}/gitlab-url`,
                stringValue: props.gitlabUrl,
            });

            new cdk.CfnOutput(this, `GitLab URL Param`, {
                value: this.gitlabUrlParam.parameterName,
            });
        }

        // Lookup secret created by build-script/secure-secrets-creation.sh
        if (process.env.GITLAB_SECRET_NAME) {
            this.gitlabSecret = secretsmanager.Secret.fromSecretNameV2(this, `${props.opaEnv.prefix}-key-gitlab-admin-secrets`, process.env.GITLAB_SECRET_NAME);
        }

    }
}
