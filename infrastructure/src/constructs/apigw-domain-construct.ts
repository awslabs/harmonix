import * as cdk from 'aws-cdk-lib/core'
import { Construct } from "constructs";
import {
  DomainName,
  EndpointType,
  SecurityPolicy
} from "aws-cdk-lib/aws-apigateway";

import { CnameRecord } from "aws-cdk-lib/aws-route53";

import { BackstageInfraConfig } from "../helpers/infra-config";
import { HostedZoneConstruct } from "./hostedzone-construct";

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface ApiGatewayDomainConstructProps extends cdk.StackProps {
  readonly config: BackstageInfraConfig;
  readonly hostedZone: HostedZoneConstruct;
  readonly environment: string;
}

const defaultProps: Partial<ApiGatewayDomainConstructProps> = {};

/**
 * Deploys the API Gateway Custom Domain construct
 */
export class ApiGatewayDomainConstruct extends Construct {

  constructor(parent: Construct, name: string, props: ApiGatewayDomainConstructProps) {
    super(parent, name);

    /* eslint-disable @typescript-eslint/no-unused-vars */
    props = { ...defaultProps, ...props };

    const domain = new DomainName(this, `${props.config.AppPrefix}-api-gw-domain-name`, {
      domainName: `${props.environment}.api.${props.hostedZone.hostedZone.zoneName}`,
      certificate: props.hostedZone.apiCertificate,
      securityPolicy: SecurityPolicy.TLS_1_2,
      endpointType: EndpointType.REGIONAL
    })

    new CnameRecord(
      this,
      `${props.config.AppPrefix}-api-gw-custom-domain-cname-record-${props.environment}`,
      {
        recordName: `${props.environment}.api`,
        zone: props.hostedZone.hostedZone,
        domainName: domain.domainNameAliasDomainName
      }
    )

  }
}
