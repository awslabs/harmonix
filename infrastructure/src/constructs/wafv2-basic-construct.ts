// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

/**
 * defines the scope for the WebACL
 * Cloudfront - for cloud front for cloud front distributions
 * Regional - for load balancers and api gateway's
 */
export enum WafV2Scope {
  /**
   * for cloudfront distributions
   */
  CLOUDFRONT = "CLOUDFRONT",
  /**
   * for api gateways, loadbalancers and other supported resources
   */
  REGIONAL = "REGIONAL",
}

export interface Wafv2BasicConstructProps extends cdk.StackProps {
  /**
   * The ACL scope.
   */
  readonly wafScope: WafV2Scope;

  /**
   * Optional rules for the firewall
   *
   * @default a default set of AWS-managed rules. {@see DEFAULT_WEBACL_RULES}
   */
  readonly rules?: Array<cdk.aws_wafv2.CfnWebACL.RuleProperty | cdk.IResolvable> | cdk.IResolvable;

  /**
   * The region where the WAF will be deployed
   */
  readonly region?: string;
}

/**
 * An array of {@link cdk.aws_wafv2.CfnWebACL.RuleProperty} containing
 * common AWS-managed web ACL rules.  These rules are in the free-tier
 * and apply to CLOUDFRONT and REGIONAL web ACLs
 *
 * - AWSManagedRulesKnownBadInputsRuleSet
 * - AWSManagedRulesCommonRuleSet
 * - AWSManagedRulesAnonymousIpList
 * - AWSManagedRulesAmazonIpReputationList
 * - AWSManagedRulesSQLiRuleSet
 */
export const DEFAULT_WEBACL_RULES: Array<cdk.aws_wafv2.CfnRuleGroup.RuleProperty> = [
  managedRuleSet("AWSManagedRulesKnownBadInputsRuleSet", "AWS", 0),
  // managedRuleSet("AWSManagedRulesCommonRuleSet", "AWS", 1),
  managedRuleSet("AWSManagedRulesAnonymousIpList", "AWS", 2),
  managedRuleSet("AWSManagedRulesAmazonIpReputationList", "AWS", 3),
  // managedRuleSet("AWSManagedRulesAdminProtectionRuleSet", "AWS", 4),
  managedRuleSet("AWSManagedRulesSQLiRuleSet", "AWS", 5),
];

/**
 * Default input properties
 */
const defaultProps: Partial<Wafv2BasicConstructProps> = {
  region: "us-east-1",
  rules: DEFAULT_WEBACL_RULES,
};

/**
 * Deploys a basic WAFv2 ACL that is open by default
 */
export class Wafv2BasicConstruct extends Construct {
  public webacl: cdk.aws_wafv2.CfnWebACL;
  public wafScope!: WafV2Scope;

  constructor(parent: Construct, name: string, props: Wafv2BasicConstructProps) {
    super(parent, name);

    props = { ...defaultProps, ...props };

    const wafScopeString = props.wafScope.toString();

    if (props.wafScope === WafV2Scope.CLOUDFRONT && props.region !== "us-east-1") {
      throw new Error(
        "Only supported region for WAFv2 scope when set to CLOUDFRONT is us-east-1. " +
          "see - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-wafv2-webacl.html"
      );
    }

    const webacl = new cdk.aws_wafv2.CfnWebACL(this, "webacl", {
      description: "Basic waf",
      defaultAction: {
        allow: {}, // allow any IP by default - it's recommended that you add a list of allowed IPs here
      },
      rules: props.rules,
      scope: wafScopeString,
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: "WAFACLGlobal",
        sampledRequestsEnabled: true,
      },
    });

    this.webacl = webacl;
  }

  /**
   * Create a new CfnWebACLAssociation to the specified resource ARN.
   * This method can only be used to add to a regional WebACL.  If the web ACL is global for CloudFront
   * distributions, an error will be thrown.
   *
   * @param id a unique identifier for the association
   * @param resourceArn The Amazon Resource Name (ARN) of the resource to associate with the web ACL.
   * @returns a {@link cdk.aws_wafv2.CfnWebACLAssociation CfnWebACLAssociation} construct
   */
  addResourceAssociation(id: string, resourceArn: string) {
    if (this.wafScope === WafV2Scope.CLOUDFRONT) {
      throw new Error(
        "Only regional web ACLs are supported.  CloudFront associations are specified through distributions." +
          "see - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.Distribution.html#webaclid"
      );
    }
    return new cdk.aws_wafv2.CfnWebACLAssociation(this, id, {
      webAclArn: this.webacl.attrArn,
      resourceArn: resourceArn,
    });
  }
}

/**
 * Helper function to wrap a managed rule group
 * @see https://docs.aws.amazon.com/waf/latest/APIReference/API_ListAvailableManagedRuleGroups.html
 *
 * @param managedGroupName the name of the managed rule group.
 * @param vendorName identifier of the vendor providing the managed rule group
 * @param priority value
 * @returns a {@link cdk.aws_wafv2.CfnRuleGroup.RuleProperty RuleProperty}
 */
function managedRuleSet(managedGroupName: string, vendorName: string, priority: number) {
  return {
    name: `${vendorName}-${managedGroupName}`,
    priority,
    overrideAction: { none: {} },
    statement: {
      managedRuleGroupStatement: {
        name: managedGroupName,
        vendorName,
      },
    },
    visibilityConfig: {
      cloudWatchMetricsEnabled: true,
      metricName: managedGroupName,
      sampledRequestsEnabled: true,
    },
  } as cdk.aws_wafv2.CfnRuleGroup.RuleProperty;
}
