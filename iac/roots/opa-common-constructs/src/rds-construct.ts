// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as rds from "aws-cdk-lib/aws-rds";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { OPAEnvironmentParams } from "./opa-environment-params";
import { NagSuppressions } from "cdk-nag";

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface RdsConstructProps extends cdk.StackProps {
  readonly opaEnv: OPAEnvironmentParams;
  readonly vpc: cdk.aws_ec2.IVpc;
  readonly kmsKey: cdk.aws_kms.IKey;
  readonly instanceType: ec2.InstanceType;
}

const defaultProps: Partial<RdsConstructProps> = {};

/**
 * Deploys the Rds construct
 */
export class RdsConstruct extends Construct {
  public readonly cluster: rds.DatabaseCluster;

  constructor(parent: Construct, name: string, props: RdsConstructProps) {
    super(parent, name);

    /* eslint-disable @typescript-eslint/no-unused-vars */
    props = { ...defaultProps, ...props };

    const envIdentifier = `${props.opaEnv.prefix.toLowerCase()}${props.opaEnv.envName}`;
    const envPathIdentifier = `/${props.opaEnv.prefix.toLowerCase()}/${props.opaEnv.envName.toLowerCase()}`;

    this.cluster = new rds.DatabaseCluster(this, `${envIdentifier}db`, {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_13_7,
      }),
      defaultDatabaseName: `${envIdentifier}db`,
      credentials: rds.Credentials.fromGeneratedSecret("postgres", {
        secretName: `${props.opaEnv.prefix.toLowerCase()}-${props.opaEnv.envName}-db-secrets`,
        encryptionKey: props.kmsKey,
        // excludeCharacters:"^ %+~`#$&*()|[]{}:;,-<>?!'/\\\",=",
        // replicaRegions: [{ region: "eu-west-2" }],
      }),
      storageEncryptionKey: props.kmsKey,
      storageEncrypted: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false,
      writer: rds.ClusterInstance.provisioned('writer', {
        instanceType: props.instanceType
      }),
      readers: [
        rds.ClusterInstance.provisioned('reader', {
          instanceType: props.instanceType
        }),
      ],
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
    });

    NagSuppressions.addResourceSuppressions(this.cluster, [
      { id: "AwsSolutions-SMG4", reason: "RDS credentials changes will need to be coordinated with a restart of the Backstage application and should not be auto-rotated" },
      { id: "AwsSolutions-RDS6", reason: "Backstage application supports username/password and does not need to support IAM authentication for the prototype" },
      { id: "AwsSolutions-RDS10", reason: "Deletion protection intentionally disabled for prototyping so that RDS CFN can be created/destroyed during rapid development" },
    ], true);


    // now save the VPC in SSM Param
    const dbParam = new ssm.StringParameter(this, `${envIdentifier}-db-param`, {
      allowedPattern: ".*",
      description: `The DB for OPA Solution: ${props.opaEnv.envName} Environment`,
      parameterName: `${envPathIdentifier}/db`,
      stringValue: this.cluster.clusterEndpoint.hostname + ":" + this.cluster.clusterEndpoint.port,
    });

    const secretParam = new ssm.StringParameter(this, `${envIdentifier}-db-secret-param`, {
      allowedPattern: ".*",
      description: `The DB Secret for OPA Solution: ${props.opaEnv.envName} Environment`,
      parameterName: `${envPathIdentifier}/db-secret`,
      stringValue: this.cluster.secret?.secretName || "",
    });

    // Post params to output
    new cdk.CfnOutput(this, "DB Param", {
      value: dbParam.parameterName,
    });

    new cdk.CfnOutput(this, "DB Secret Param", {
      value: secretParam.parameterName,
    });

  }
}
