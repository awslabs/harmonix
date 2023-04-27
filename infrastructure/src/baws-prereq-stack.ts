// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as kms from "aws-cdk-lib/aws-kms";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { BackstageInfraConfig } from "./helpers/infra-config";

export interface BAWSPrereqStackProps extends cdk.StackProps {
  readonly config: BackstageInfraConfig;
}

export class BAWSPrereqStack extends cdk.Stack {

  constructor(scope: Construct, id: string, props: BAWSPrereqStackProps) {
    super(scope, id, props);

    // Create encryption key for all data at rest encryption
    const key = new kms.Key(this, `${props.config.AppPrefix}-key`, {
      alias: `${props.config.AppPrefix}-key`,
      enableKeyRotation: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pendingWindow: cdk.Duration.days(8),
    });

    // Create a secret to store Okta authentication details
    const oktaSecret = new secretsmanager.Secret(this, `${props.config.AppPrefix}-key-okta-secrets`, {
      secretName: `${props.config.AppPrefix}-okta-secrets`,
      secretObjectValue: {
        clientId    : cdk.SecretValue.unsafePlainText(""),
        clientSecret: cdk.SecretValue.unsafePlainText(""),
        audience    : cdk.SecretValue.unsafePlainText(""),
        authServerId: cdk.SecretValue.unsafePlainText(""),
        idp         : cdk.SecretValue.unsafePlainText(""),
        apiToken    : cdk.SecretValue.unsafePlainText(""),
      },
      encryptionKey: key,
      replicaRegions: [{ region: props.config.ReplicaRegion }],
      
    });

    //Create Gitlab Admins Secret
    const gitlabAdminSecret = new secretsmanager.Secret(this, `${props.config.AppPrefix}-key-gitlab-admin-secrets`, {
      secretName: `${props.config.AppPrefix}-admin-gitlab-secrets`,
      secretObjectValue: {
        username: cdk.SecretValue.unsafePlainText("baws-admin"),
        password: cdk.SecretValue.unsafePlainText(""),
        apiToken: cdk.SecretValue.unsafePlainText(""),
        runnerId: cdk.SecretValue.unsafePlainText(""),
        runnerRegistrationToken: cdk.SecretValue.unsafePlainText(""),
      },
      encryptionKey: key,
      replicaRegions: [{ region: props.config.ReplicaRegion }],
    });


    // save KMS key arn in an SSM Parameter
    new ssm.StringParameter(this, "${props.config.AppPrefix}-key-param", {
      allowedPattern: ".*",
      description: "The KMS Key for BAWS Solution",
      parameterName: `${props.config.AppPrefix}-kms-key`,
      stringValue: key.keyArn,
    });

    // Create an ECR repository to contain backstage container images
    const ecrRepository = new ecr.Repository(this, `${props.config.AppPrefix}-ecr-repository`, {
      repositoryName: `${props.config.AppPrefix}-backstage`,
      imageScanOnPush: true,
      encryption: ecr.RepositoryEncryption.KMS,
      encryptionKey: key,
    });

    // Save ECR Repo in an SSM Parameter
    new ssm.StringParameter(this, `${props.config.AppPrefix}-backstage-ecr-param`, {
      allowedPattern: ".*",
      description: "The ECR Key for Backstage Solution",
      parameterName: `${props.config.AppPrefix}-backstage-ecr`,
      stringValue: ecrRepository.repositoryName,
    });

    new cdk.CfnOutput(this, `${props.config.AppPrefix}-ecr-output`, {
      value: ecrRepository.repositoryName,
      description: "ECR repository for backstage platform images",
    });

    new cdk.CfnOutput(this, "okta-secrets-output", {
      value: oktaSecret.secretName,
    });
  }
}
