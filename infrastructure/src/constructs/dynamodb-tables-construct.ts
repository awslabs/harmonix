// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { BackstageInfraConfig } from "../helpers/infra-config";

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface DynamoDBConstructProps extends cdk.StackProps {
  readonly config: BackstageInfraConfig;
  readonly tableName: string;
  readonly kmsKey: cdk.aws_kms.IKey;
}

const defaultProps: Partial<DynamoDBConstructProps> = {};

/**
 * Deploys the DynamoDB construct
 */
export class DynamoDBConstruct extends Construct {
  public table: dynamodb.Table;

  constructor(parent: Construct, name: string, props: DynamoDBConstructProps) {
    super(parent, name);

    /* eslint-disable @typescript-eslint/no-unused-vars */
    props = { ...defaultProps, ...props };
    this.table = new dynamodb.Table(this, `${props.tableName}-table`, {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "createdAt", type: dynamodb.AttributeType.STRING },
      // encryptionKey:props.kmsKey,                  // Only valid for single region
      // encryption:dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // TODO: Change for PROD
    });

    this.table.addGlobalSecondaryIndex({
      indexName: "currentDateIdx",
      partitionKey: { name: "currentDate", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Create SSM to store table name
    new ssm.StringParameter(this, `${props.config.AppPrefix}-${props.tableName}-param`, {
      allowedPattern: ".*",
      description: `SSM Param for ${props.tableName}`,
      parameterName: `/${props.config.AppPrefix}/${props.tableName}`,
      stringValue: this.table.tableName,
    });
  }
}
