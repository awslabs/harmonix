// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

import { Wafv2BasicConstruct, WafV2Scope } from "./constructs/wafv2-basic-construct";

export class CfWafStack extends cdk.Stack {
  /**
   * Name of the WafArn SSM parameter
   */
  public ssmWafArnParameterName: string;

  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    // ssm parameter name must be unique in a region
    this.ssmWafArnParameterName = "waf_acl_arn_" + this.stackName;

    // requires us-east-1 for deployment to work due to limitations with the service.
    // for deployments outside of us-east-1 deploy waf separately
    const wafv2CF = new Wafv2BasicConstruct(this, "Wafv2CF", {
      wafScope: WafV2Scope.CLOUDFRONT,
    });

    new cdk.aws_ssm.StringParameter(this, "waf_acl_arn", {
      parameterName: this.ssmWafArnParameterName,
      description: "WAF ACL ARN",
      stringValue: wafv2CF.webacl.attrArn,
    });
  }
}
