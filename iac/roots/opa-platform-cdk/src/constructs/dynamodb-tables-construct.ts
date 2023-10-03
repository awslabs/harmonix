// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { OPAEnvironmentParams } from "./opa-environment-params";

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface DynamoDBConstructProps extends cdk.StackProps {
  readonly opaEnv: OPAEnvironmentParams;
  readonly tableName: string;
  readonly kmsKey: cdk.aws_kms.IKey;
}

const defaultProps: Partial<DynamoDBConstructProps> = {};

/**
 * Deploys the DynamoDB construct
 */
export class DynamoDBConstruct extends Construct {
  public table: dynamodb.Table;
  public tableParam: ssm.StringParameter;

  constructor(parent: Construct, name: string, props: DynamoDBConstructProps) {
    super(parent, name);

    /* eslint-disable @typescript-eslint/no-unused-vars */
    props = { ...defaultProps, ...props };
    const envIdentifier = `${props.opaEnv.prefix.toLowerCase()}-${props.opaEnv.envName}`;
    const envPathIdentifier = `/${props.opaEnv.prefix.toLowerCase()}/${props.opaEnv.envName.toLowerCase()}`;

    this.table = new dynamodb.Table(this, `${envIdentifier}-table`, {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "createdAt", type: dynamodb.AttributeType.STRING },
      tableName: props.tableName,
      encryptionKey: props.kmsKey,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // TODO: Change for PROD
      pointInTimeRecovery: true,
    });

    this.table.addGlobalSecondaryIndex({
      indexName: "currentDateIdx",
      partitionKey: { name: "currentDate", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // now save the VPC in SSM Param
    const tableParam = new ssm.StringParameter(this, `${envIdentifier}-${props.tableName}-param`, {
      allowedPattern: ".*",
      description: `The DynamoDB Table ${props.tableName} for OPA Solution: ${props.opaEnv.envName} Environment`,
      parameterName: `${envPathIdentifier}/${props.tableName}`,
      stringValue: this.table.tableName,
    });

    this.tableParam = tableParam;

  }
}
