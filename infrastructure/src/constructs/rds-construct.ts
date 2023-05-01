// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

import * as rds from "aws-cdk-lib/aws-rds";
import * as ec2 from "aws-cdk-lib/aws-ec2";

import { BackstageInfraConfig } from "../helpers/infra-config";

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface RdsConstructProps extends cdk.StackProps {
  readonly config: BackstageInfraConfig;
  readonly vpc: cdk.aws_ec2.Vpc;
  readonly allowedIpsSg: cdk.aws_ec2.SecurityGroup;
  readonly kmsKey: cdk.aws_kms.IKey;
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

    this.cluster = new rds.DatabaseCluster(this, "Backstage-db", {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_13_7,
      }),
      defaultDatabaseName: `${props.config.AppPrefix}db`,
      credentials: rds.Credentials.fromGeneratedSecret("postgres", {
        secretName: `${props.config.AppPrefix}-db-secrets`,
        encryptionKey: props.kmsKey,
        // excludeCharacters:"^ %+~`#$&*()|[]{}:;,-<>?!'/\\\",=",
        replicaRegions: [{ region: "eu-west-2" }],
      }),
      storageEncryptionKey: props.kmsKey,
      storageEncrypted: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false,
      instanceProps: {
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.R6G, ec2.InstanceSize.XLARGE),
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        vpc: props.vpc,
      },
    });

    this.cluster.connections.allowDefaultPortFrom(
      props.allowedIpsSg,
      "allow traffic on default db port from specific IP in the security group"
    );
    for (const ip of props.config.AllowedIPs) {
      this.cluster.connections.allowDefaultPortFrom(ec2.Peer.ipv4(ip));
    }

    new cdk.CfnOutput(this, "rds-db", {
      value: this.cluster.clusterEndpoint.hostname + ":" + this.cluster.clusterEndpoint.port,
    });
  }
}
