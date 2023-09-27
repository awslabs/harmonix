// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import { Certificate, ValidationMethod } from "aws-cdk-lib/aws-certificatemanager";
import { HostedZone, IHostedZone } from "aws-cdk-lib/aws-route53";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { OPAEnvironmentParams } from "./opa-environment-params";


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

  constructor(parent: Construct, name: string, props: HostedZoneConstructProps) {
    super(parent, name);

    /* eslint-disable @typescript-eslint/no-unused-vars */
    props = { ...defaultProps, ...props };

    const hostedZone = HostedZone.fromLookup(this, `${props.opaEnv.prefix}-r53zone`, {
      domainName: props.R53HostedZoneName,
    });
    this.rootDnsName = props.R53HostedZoneName;
    this.hostedZone = hostedZone;

    const sslCert = new Certificate(this, `${props.opaEnv.prefix}-backstage-cert`, {
      domainName: `*.${props.R53HostedZoneName}`,
      validation: {
        method: ValidationMethod.DNS,
        props: {
          method: ValidationMethod.DNS,
          hostedZone: hostedZone,
        },
      },
    });
    this.certificate = sslCert;

    const apiSslCert = new Certificate(this, `${props.opaEnv.prefix}-backstage-cert-api`, {
      domainName: `*.api.${props.R53HostedZoneName}`,
      validation: {
        method: ValidationMethod.DNS,
        props: {
          method: ValidationMethod.DNS,
          hostedZone: hostedZone,
        },
      },
    });
    this.apiCertificate = apiSslCert;

    new ssm.StringParameter(this, `${props.opaEnv.prefix}-hosted-zone-domain-param`, {
      allowedPattern: ".*",
      description: "The domain of the hosted zone",
      parameterName: `/${props.opaEnv.prefix}/domain`,
      stringValue: props.R53HostedZoneName,
    });

    new ssm.StringParameter(this, `${props.opaEnv.prefix}-api-hosted-zone-domain-param`, {
      allowedPattern: ".*",
      description: "The API subdomain",
      parameterName: `/${props.opaEnv.prefix}/api-domain`,
      stringValue: `api.${props.R53HostedZoneName}`,
    });

  }
}
