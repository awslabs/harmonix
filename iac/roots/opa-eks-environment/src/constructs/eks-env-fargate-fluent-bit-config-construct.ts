// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as eks from "aws-cdk-lib/aws-eks";
import { OPAEnvironmentParams } from "@aws/aws-app-development-common-constructs";

export interface OPAEKSFargateClusterFluentBitConstructProps extends cdk.StackProps {
  readonly opaEnv: OPAEnvironmentParams;

  cluster: eks.Cluster
}

export class OPAEKSFargateClusterFluentBitConstruct extends Construct {

  constructor(parent: Construct, name: string, props: OPAEKSFargateClusterFluentBitConstructProps) {
    super(parent, name);

    const stack = cdk.Stack.of(this);
    const envIdentifier = `${props.opaEnv.prefix.toLowerCase()}-${props.opaEnv.envName}`;

    // See https://docs.aws.amazon.com/eks/latest/userguide/fargate-logging.html
    // See https://docs.fluentbit.io/manual/pipeline/outputs/cloudwatch

    // creating observability namespace
    const awsObservabilityManifest = props.cluster.addManifest(`${envIdentifier}-aws-observability-namespace`, {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: { name: 'aws-observability', labels: { 'aws-observability': 'enabled' } },
    });

    // Define the ConfigMap manifest
    const awsLoggingConfigMap = {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name: 'aws-logging',
        namespace: 'aws-observability',
      },
      data: {
        flb_log_cw: 'false',
        'filters.conf': `[FILTER]\n    Name parser\n    Match *\n    Key_name log\n    Parser crio\n[FILTER]\n    Name kubernetes\n    Match kube.*\n    Merge_Log On\n    Keep_Log Off\n    Buffer_Size 0\n    Kube_Meta_Cache_TTL 300s`,
        'output.conf': `[OUTPUT]\n    Name cloudwatch_logs\n    Match kube.*\n    region ${stack.region}\n    log_group_name /aws/apps/${envIdentifier}\n    log_stream_prefix fluent-bit-fallback-\n    log_group_template /aws/apps/${envIdentifier}/$kubernetes['namespace_name']\n    log_stream_template $kubernetes['pod_name'].$kubernetes['container_name']\n    log_retention_days 60\n    auto_create_group true`,
        'parsers.conf': `[PARSER]\n    Name crio\n    Format Regex\n    Regex ^(?<time>[^ ]+) (?<stream>stdout|stderr) (?<logtag>P|F) (?<log>.*)$\n    Time_Key    time\n    Time_Format %Y-%m-%dT%H:%M:%S.%L%z\n    Time_Keep On`,
      },
    };

    // Add the ConfigMap manifest to the cluster
    const awsLoggingConfigMapManifest = props.cluster.addManifest('AwsLoggingConfigMapManifest', awsLoggingConfigMap);

    // This will fail to deploy if you don't ensure that the aws-observability namespace is created first
    awsLoggingConfigMapManifest.node.addDependency(awsObservabilityManifest);

  }

}
