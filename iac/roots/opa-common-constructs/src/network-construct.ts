// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { SubnetType } from "aws-cdk-lib/aws-ec2";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";
import { OPAEnvironmentParams } from "./opa-environment-params";

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface NetworkConstructProps extends cdk.StackProps {
  readonly opaEnv: OPAEnvironmentParams;
  readonly cidrRange: string;
  readonly isIsolated: boolean;
  readonly allowedIPs?: string[];
  readonly publicVpcNatGatewayCount: number;
  readonly vpcAzCount: number;
  readonly existingVpcId?: string;
}

const defaultProps: Partial<NetworkConstructProps> = {};

/**
 * Deploys the VpcAllowedIps construct
 */
export class NetworkConstruct extends Construct {
  public readonly vpc: ec2.IVpc;
  public readonly allowedIpsSg: ec2.SecurityGroup;
  public readonly publicEIPref!: string[];
  public readonly logBucket: s3.IBucket;
  public readonly vpcParam: ssm.StringParameter;

  constructor(parent: Construct, name: string, props: NetworkConstructProps) {
    super(parent, name);

    const envIdentifier = `${props.opaEnv.prefix.toLowerCase()}-${props.opaEnv.envName}`;
    const envPathIdentifier = `/${props.opaEnv.prefix.toLowerCase()}/${props.opaEnv.envName.toLowerCase()}`;

    /* eslint-disable @typescript-eslint/no-unused-vars */
    props = { ...defaultProps, ...props };
    let vpc;

    if (props.existingVpcId) {
      //Use the existing VPC

      vpc = ec2.Vpc.fromLookup(this, "ExistingVPC", {
        vpcId: props.existingVpcId,
      });

       // Retrieve the subnet IDs

     // Retrieve the subnet IDs
      const publicsubnetIds = vpc.publicSubnets.length > 0 
          ? vpc.publicSubnets.map(subnet => subnet.subnetId) 
          : [' '];
      const privateSubnetIds = vpc.privateSubnets.length > 0 
          ? vpc.privateSubnets.map(subnet => subnet.subnetId) 
          : [' '];

      // Store the public subnet IDs in AWS Systems Manager Parameter Store
      new ssm.StringListParameter(this, `${envIdentifier}-pub-subnet-param`, {
          allowedPattern: ".*",
          description: `The VPC public subnetIds for OPA Solution: ${props.opaEnv.envName} Environment`,
          parameterName: `${envPathIdentifier}/vpc/public-subnets`,
          stringListValue: publicsubnetIds,
      });

      // Store the private subnet IDs in AWS Systems Manager Parameter Store
      new ssm.StringListParameter(this, `${envIdentifier}-priv-subnet-param`, {
          allowedPattern: ".*",
          description: `The VPC Private subnetIds for OPA Solution: ${props.opaEnv.envName} Environment`,
          parameterName: `${envPathIdentifier}/vpc/private-subnets`,
          stringListValue: privateSubnetIds,
      });


    } else {
      let publicSubnetIds;
      let privateSubnetIds;

      if (props.isIsolated) {
        // Private VPC
        vpc = new ec2.Vpc(this, `${envIdentifier}-VPC`, {
          ipAddresses: ec2.IpAddresses.cidr(props.cidrRange),
          enableDnsHostnames: true,
          enableDnsSupport: true,
          vpcName: name,
          natGateways: 0,
          subnetConfiguration: [
            {
              cidrMask: 23,
              name: "Isolated",
              subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
            },
          ],
          maxAzs: props.vpcAzCount,
        });

        publicSubnetIds = "[]";
        privateSubnetIds = JSON.stringify(
          vpc.selectSubnets({ subnetType: SubnetType.PRIVATE_ISOLATED }).subnets.map((subnet) => subnet.subnetId)
        );
      } else {
        // Public VPC
        const allocationIds: string[] = [];
        this.publicEIPref = [];

      // Create as many EIP as there are AZ/Subnets and store their allocIds & refs.
      for (let i = 0; i < props.vpcAzCount; i++) {
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
        vpc = new ec2.Vpc(this, `${envIdentifier}-VPC`, {
          ipAddresses: ec2.IpAddresses.cidr(props.cidrRange),
          enableDnsHostnames: true,
          enableDnsSupport: true,
          vpcName: name,
          natGateways: props.publicVpcNatGatewayCount,
          maxAzs: props.vpcAzCount,
          natGatewayProvider: ec2.NatProvider.gateway({
            eipAllocationIds: allocationIds,
          }),
          defaultInstanceTenancy: ec2.DefaultInstanceTenancy.DEFAULT,
        });

        publicSubnetIds = JSON.stringify(vpc.publicSubnets.map((subnet) => subnet.subnetId));
        privateSubnetIds = JSON.stringify(vpc.privateSubnets.map((subnet) => subnet.subnetId));
      }
          // now save the VPC in SSM Param
      

      const vpcPubSubnetParam = new ssm.StringListParameter(this, `${envIdentifier}-pub-subnet-param`, {
        allowedPattern: ".*",
        description: `The VPC public subnetIds for OPA Solution: ${props.opaEnv.envName} Environment`,
        parameterName: `${envPathIdentifier}/vpc/public-subnets`,
        stringListValue: JSON.parse(publicSubnetIds) as string[],
      });

      const vpcPriSubnetParam = new ssm.StringListParameter(this, `${envIdentifier}-priv-subnet-param`, {
        allowedPattern: ".*",
        description: `The VPC Private subnetIds for OPA Solution: ${props.opaEnv.envName} Environment`,
        parameterName: `${envPathIdentifier}/vpc/private-subnets`,
        stringListValue: JSON.parse(privateSubnetIds) as string[],
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

    }

    const vpcParam = new ssm.StringParameter(this, `${envIdentifier}-vpc-param`, {
      allowedPattern: ".*",
      description: `The VPC ID for OPA Solution: ${props.opaEnv.envName} Environment`,
      parameterName: `${envPathIdentifier}/vpc`,
      stringValue: vpc.vpcId,
    });
    // Create an S3 bucket to use for network logs
    const accessLogBucket = new s3.Bucket(this, `${envIdentifier}-log-bucket`, {
      // CDK does not reliably delete this S3 bucket since health check logs
      // keep getting added and appear to create a race condition.
      // This bucket will be deleted by direct commands instead.
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
      autoDeleteObjects: false,
      versioned: false,
      enforceSSL: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      // serverAccessLogsPrefix: 'serverAccessLogs',
    });

    NagSuppressions.addResourceSuppressions(accessLogBucket, [
      {
        id: "AwsSolutions-S1",
        reason:
          "Access log bucket will not record access since that will introduce cyclic behavior preventing deletion of the bucket",
      },
    ]);

    // TODO: enable S3 bucket loggingin PROD.  For prototype, default logging to CloudWatch Logs will be sufficient
    vpc.addFlowLog(`${envIdentifier}-FlowLogs`, {
      // destination:ec2.FlowLogDestination.toS3(accessLogBucket),
      // trafficType:ec2.FlowLogTrafficType.ALL
    });

    this.logBucket = accessLogBucket;

  
    // *** ADD more as required kinesis, MSK etc.  ***

    // Create security group with external specific access
    const allowedIpsSg = new ec2.SecurityGroup(this, "allowed-ip-sg", {
      vpc,
      allowAllOutbound: true,
      description: "security group for allowed IPs",
    });
    NagSuppressions.addResourceSuppressions(allowedIpsSg, [
      {
        id: "AwsSolutions-EC23",
        reason: "Access public access for training and workshop reasons",
      },
    ]);

    if (props.allowedIPs) {
      for (const ip of props.allowedIPs) {
        if (ip.startsWith("pl-")) {
          // add the prefix list to the security group
          allowedIpsSg.addIngressRule(
            ec2.Peer.prefixList(ip),
            ec2.Port.tcp(5432),
            "allow DB access from Allowed Prefix List"
          );
          allowedIpsSg.addIngressRule(
            ec2.Peer.prefixList(ip),
            ec2.Port.tcp(80),
            "allow HTTP access from Allowed Prefix List"
          );
          allowedIpsSg.addIngressRule(
            ec2.Peer.prefixList(ip),
            ec2.Port.tcp(443),
            "allow HTTPS access from Allowed Prefix List"
          );
        } else {
          // add the ip to the security group
          allowedIpsSg.addIngressRule(ec2.Peer.ipv4(ip), ec2.Port.tcp(5432), "allow DB access from Allowed IP");
          allowedIpsSg.addIngressRule(ec2.Peer.ipv4(ip), ec2.Port.tcp(80), "allow HTTP access from Allowed IP");
          allowedIpsSg.addIngressRule(ec2.Peer.ipv4(ip), ec2.Port.tcp(443), "allow HTTPS access from Allowed IPs");
        }
      }
    }
    this.allowedIpsSg = allowedIpsSg;
    this.vpc = vpc;
    this.vpcParam = vpcParam;
  }
}
