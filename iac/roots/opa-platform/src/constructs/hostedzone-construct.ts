// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { OPAEnvironmentParams } from "./opa-environment-params";
import * as cdk from "aws-cdk-lib";
import {
  Certificate,
  ValidationMethod,
} from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import { IHostedZone } from "aws-cdk-lib/aws-route53";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { CustomConstruct } from "./custom-resource-construct";

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface HostedZoneConstructProps extends cdk.StackProps {
  readonly opaEnv: OPAEnvironmentParams;
  readonly R53HostedZoneName: string;
}

const defaultProps: Partial<HostedZoneConstructProps> = {};

export class HostedZoneConstruct extends Construct {
  public hostedZone: IHostedZone;
  public certificate: Certificate;
  public apiCertificate: Certificate;
  public rootDnsName: string;

  constructor(
    parent: Construct,
    name: string,
    props: HostedZoneConstructProps
  ) {
    super(parent, name);

    /* eslint-disable @typescript-eslint/no-unused-vars */
    props = { ...defaultProps, ...props };

    // const hostedZone = HostedZone.fromLookup(
    //   this,
    //   `${props.aadEnv.prefix}-r53zone`,
    //   {
    //     domainName: props.R53HostedZoneName,
    //   }
    // );

    const hostedZone = new route53.PublicHostedZone(this, "HostedZone", {
      zoneName: props.R53HostedZoneName,
    });
    this.rootDnsName = hostedZone.zoneName;
    this.hostedZone = hostedZone;

    const domainDelegator = new CustomConstruct(this, "domainDelegator", {
      foldername: "domain-delegator",
      envParams: {
        ZONE_ID: hostedZone.hostedZoneId,
      },
    });

    domainDelegator.node.addDependency(hostedZone);

    const sslCert = new Certificate(
      this,
      `${props.opaEnv.prefix}-backstage-cert`,
      {
        // domainName: "*." + props.config.R53HostedZoneName,
        domainName: `*.${hostedZone.zoneName}`,
        // domainName:'*.zahi.backstage.fsi.pace.aws.dev',
        validation: {
          method: ValidationMethod.DNS,
          props: {
            method: ValidationMethod.DNS,
            hostedZone: hostedZone,
          },
        },
      }
    );
    this.certificate = sslCert;

    //sslCert.node.addDependency(domainDelegator)

    const apiSslCert = new Certificate(
      this,
      `${props.opaEnv.prefix}-backstage-cert-api`,
      {
        domainName: `*.api.${props.R53HostedZoneName}`,
        validation: {
          method: ValidationMethod.DNS,
          props: {
            method: ValidationMethod.DNS,
            hostedZone: hostedZone,
          },
        },
      }
    );
    this.apiCertificate = apiSslCert;

    //apiSslCert.node.addDependency(domainDelegator)

    new ssm.StringParameter(
      this,
      `${props.opaEnv.prefix}-hosted-zone-domain-param`,
      {
        allowedPattern: ".*",
        description: "The domain of the hosted zone",
        parameterName: `/${props.opaEnv.prefix}/domain`,
        stringValue: hostedZone.zoneName,
      }
    );

    new ssm.StringParameter(
      this,
      `${props.opaEnv.prefix}-api-hosted-zone-domain-param`,
      {
        allowedPattern: ".*",
        description: "The API subdomain",
        parameterName: `/${props.opaEnv.prefix}/api-domain`,
        stringValue: `api.${hostedZone.zoneName}`,
      }
    );
  }
}
