// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";

import { bool } from "aws-sdk/clients/signer";
import { BackstageInfraConfig } from "../helpers/infra-config";
import { SubnetType } from "aws-cdk-lib/aws-ec2";

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface NetworkConstructProps extends cdk.StackProps {
  readonly config: BackstageInfraConfig;
  readonly cidrRange: string;
  readonly id: string;
  readonly isIsolated: bool;
}

const defaultProps: Partial<NetworkConstructProps> = {};

/**
 * Deploys the VpcAllowedIps construct
 */
export class NetworkConstruct extends Construct {
  public readonly vpc: ec2.Vpc;
  public readonly allowedIpsSg: ec2.SecurityGroup;
  public readonly publicEIPref!: string[];

  constructor(parent: Construct, name: string, props: NetworkConstructProps) {
    super(parent, name);

    /* eslint-disable @typescript-eslint/no-unused-vars */
    props = { ...defaultProps, ...props };
    let vpc = null;
    let publicSubnetIds;
    let privateSubnetIds;

    if (props.isIsolated) {
      // Private VPC
      vpc = new ec2.Vpc(this, `${props.config.AppPrefix}-${props.id}-VPC`, {
        ipAddresses: ec2.IpAddresses.cidr(props.cidrRange),
        enableDnsHostnames: true,
        enableDnsSupport: true,
        vpcName: name,
        natGateways: 0,
        subnetConfiguration: [{ cidrMask: 23, name: "Isolated", subnetType: ec2.SubnetType.PRIVATE_ISOLATED }],
        maxAzs: 2,
      });

      publicSubnetIds = "[]";
      privateSubnetIds = JSON.stringify(
        vpc.selectSubnets({subnetType: SubnetType.PRIVATE_ISOLATED}).subnets
        .map(subnet => subnet.subnetId));

    } else {
      // Public VPC
      const allocationIds: string[] = [];
      this.publicEIPref = [];

      // Create as many EIP as there are AZ/Subnets and store their allocIds & refs.
      for (let i = 0; i < 2; i++) {
        const eip = new ec2.CfnEIP(this, `VPCPublicSubnet${i + 1}NATGatewayEIP${i}`, {
          domain: "vpc",
          tags: [
            {
              key: "Name",
              value: `${name}/VPC/PublicSubnet${i + 1}`,
            },
          ],
        });

        allocationIds.push(eip.attrAllocationId);

        // Do whatever you need with your EIPs here, ie. store their ref for later use
        this.publicEIPref.push(eip.ref);
      }
      vpc = new ec2.Vpc(this, `${props.config.AppPrefix}-${props.id}-VPC`, {
        ipAddresses: ec2.IpAddresses.cidr(props.cidrRange),
        enableDnsHostnames: true,
        enableDnsSupport: true,
        vpcName: name,
        natGateways: 2,
        maxAzs: 2,
        natGatewayProvider: ec2.NatProvider.gateway({ eipAllocationIds: allocationIds }),
        defaultInstanceTenancy: ec2.DefaultInstanceTenancy.DEFAULT,
      });

      publicSubnetIds = JSON.stringify(vpc.publicSubnets.map(subnet => subnet.subnetId));
      privateSubnetIds = JSON.stringify(vpc.privateSubnets.map(subnet => subnet.subnetId));
    }
    new ssm.StringParameter(this, `${props.config.AppPrefix}-${props.id}-param`, {
      allowedPattern: ".*",
      description: "Param for VPC of network " + name,
      parameterName: `/${props.config.AppPrefix}/${props.id}`,
      stringValue: vpc.vpcId,
    });

    new ssm.StringParameter(this, `${props.config.AppPrefix}-${props.id}-pub-subnet-param`, {
      allowedPattern: ".*",
      description: `Param for VPC public subnetIds of network ${name}`,
      parameterName: `/${props.config.AppPrefix}/${props.id}/public-subnets`,
      stringValue: publicSubnetIds,
    });
    
    new ssm.StringParameter(this, `${props.config.AppPrefix}-${props.id}-priv-subnet-param`, {
      allowedPattern: ".*",
      description: `Param for VPC private subnetIds of network ${name}`,
      parameterName: `/${props.config.AppPrefix}/${props.id}/private-subnets`,
      stringValue: privateSubnetIds,
    });

    vpc.addFlowLog(`${props.id}-Log`, {
      // use defaults to log to CloudWatch Logs
    });

    // Create VPC Endpoints to access the network
    vpc.addGatewayEndpoint("dynamoDBEndpoint", {
      service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
    });

    vpc.addGatewayEndpoint("S3Endpoint", {
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });

    vpc.addInterfaceEndpoint("RDSEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.RDS,
    });

    vpc.addInterfaceEndpoint("ELBEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.ELASTIC_LOAD_BALANCING,
    });

    vpc.addInterfaceEndpoint("LambdaEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.LAMBDA,
    });

    vpc.addInterfaceEndpoint("CloudWatchEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH,
    });

    vpc.addInterfaceEndpoint("APIGatewayEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.APIGATEWAY,
    });

    vpc.addInterfaceEndpoint("SNSEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.SNS,
    });

    vpc.addInterfaceEndpoint("SQSEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.SQS,
    });

    vpc.addInterfaceEndpoint("KMSEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.KMS,
    });

    vpc.addInterfaceEndpoint("ECREndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.ECR,
    });

    vpc.addInterfaceEndpoint("ECRDockerEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
    });


    // *** ADD more as required Kenisis, MSK etc.  ***

    // Create security group with external specific access
    const allowedIpsSg = new ec2.SecurityGroup(this, "allowed-ip-sg", {
      vpc,
      allowAllOutbound: true,
      description: "security group for allowed IPs",
    });

    for (const ip of props.config.AllowedIPs) {
      allowedIpsSg.addIngressRule(ec2.Peer.ipv4(ip), ec2.Port.tcp(5432), "allow DB access from Allowed IPs");
      allowedIpsSg.addIngressRule(ec2.Peer.ipv4(ip), ec2.Port.tcp(443), "allow HTTPS access from Allowed IPs");
      allowedIpsSg.addIngressRule(ec2.Peer.ipv4(ip), ec2.Port.tcp(80), "allow HTTP access from Allowed IPs");
    }

    this.allowedIpsSg = allowedIpsSg;
    this.vpc = vpc;
  }
}
