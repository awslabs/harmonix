// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import { Certificate, ValidationMethod } from "aws-cdk-lib/aws-certificatemanager";
import { HostedZone, IHostedZone } from "aws-cdk-lib/aws-route53";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { BackstageInfraConfig } from "../helpers/infra-config";

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface HostedZoneConstructProps extends cdk.StackProps {
  readonly config: BackstageInfraConfig;
}

const defaultProps: Partial<HostedZoneConstructProps> = {};

export class HostedZoneConstruct extends Construct {
  public hostedZone: IHostedZone;
  public certificate: Certificate;
  public apiCertificate: Certificate;

  constructor(parent: Construct, name: string, props: HostedZoneConstructProps) {
    super(parent, name);

    /* eslint-disable @typescript-eslint/no-unused-vars */
    props = { ...defaultProps, ...props };

    const hostedZone = HostedZone.fromLookup(this, `${props.config.AppPrefix}-r53zone`, {
      domainName: props.config.R53HostedZoneName,
    });

    this.hostedZone = hostedZone;

    const sslCert = new Certificate(this, `${props.config.AppPrefix}-backstage-cert`, {
      // domainName: "*." + props.config.R53HostedZoneName,
      domainName: `*.${props.config.R53HostedZoneName}`,
      // domainName:'*.zahi.backstage.fsi.pace.aws.dev',
      validation: {
        method: ValidationMethod.DNS,
        props: {
          method: ValidationMethod.DNS,
          hostedZone: hostedZone,
        },
      },
    });
    this.certificate = sslCert;

    const apiSslCert = new Certificate(this, `${props.config.AppPrefix}-backstage-cert-api`, {
      domainName: `*.api.${props.config.R53HostedZoneName}`,
      validation: {
        method: ValidationMethod.DNS,
        props: {
          method: ValidationMethod.DNS,
          hostedZone: hostedZone,
        },
      },
    });
    this.apiCertificate = apiSslCert;

    new ssm.StringParameter(this, `${props.config.AppPrefix}-hosted-zone-domain-param`, {
      allowedPattern: ".*",
      description: "The domain of the hosted zone",
      parameterName: `/${props.config.AppPrefix}/domain`,
      stringValue: props.config.R53HostedZoneName,
    });

    new ssm.StringParameter(this, `${props.config.AppPrefix}-api-hosted-zone-domain-param`, {
      allowedPattern: ".*",
      description: "The API subdomain",
      parameterName: `/${props.config.AppPrefix}/api-domain`,
      stringValue: `api.${props.config.R53HostedZoneName}`,
    });

  }
}
