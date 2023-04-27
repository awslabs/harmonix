// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as alb from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as albTargets from "aws-cdk-lib/aws-elasticloadbalancingv2-targets";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import { readFileSync } from "fs";
import { BackstageInfraConfig } from "../helpers/infra-config";
import { NetworkConstruct } from "./network-construct";
import { HostedZoneConstruct } from "./hostedzone-construct";

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface GitlabHostingConstructProps extends cdk.StackProps {
  readonly config: BackstageInfraConfig;
  readonly hostedZone: HostedZoneConstruct;
  readonly network: NetworkConstruct;
  /**
   * A reference to the S3 bucket to use for access log storage
   */
  readonly accessLogBucket: s3.IBucket,
}

const defaultProps: Partial<GitlabHostingConstructProps> = {};

/**
 * Deploys the GitlabHosting construct
 */
export class GitlabHostingConstruct extends Construct {
  public readonly loadbalancer: alb.ApplicationLoadBalancer;

  constructor(parent: Construct, name: string, props: GitlabHostingConstructProps) {
    super(parent, name);

    /* eslint-disable @typescript-eslint/no-unused-vars */
    props = { ...defaultProps, ...props };

    const instanceSecurityGroup = new ec2.SecurityGroup(this, "gitlab-instance-sg", { vpc: props.network.vpc });
    const albSecurityGroup = new ec2.SecurityGroup(this, "gitlab-alb-sg", { vpc: props.network.vpc });

    const glRunnerSgName = `${props.config.AppPrefix}-alb-gitlab-runner-sg`;
    const gitlabRunnerSecurityGroup = new ec2.SecurityGroup(this, glRunnerSgName, {
      vpc: props.network.vpc,
      securityGroupName: glRunnerSgName,
    });
    cdk.Tags.of(gitlabRunnerSecurityGroup).add("Name", glRunnerSgName);

    const gitlabIamRolePolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          resources: ["*"],
          actions: [
            "secretsmanager:DescribeSecret",
            "secretsmanager:GetSecretValue",
            "secretsmanager:PutSecretValue",
            "secretsmanager:GetSecretValue",
            "kms:GenerateDataKey",
            "kms:Decrypt",
          ],
        }),
      ],
    });

    const gitlabEc2Role = new iam.Role(this, "GitlabIamRole", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      description: "Iam Role assumed by the Gitlab server",
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore")],
      inlinePolicies: { GitlabIamRolePolicy: gitlabIamRolePolicy },
    });

    const rootVolume: ec2.BlockDevice = {
      deviceName: "/dev/sda1",
      volume: ec2.BlockDeviceVolume.ebs(2000, {
        encrypted: true,
      }),
    };

    const gitlabHost = new ec2.Instance(this, "GitlabHost", {
      instanceName: `${props.config.AppPrefix}-GitlabHost`,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.C5, ec2.InstanceSize.XLARGE),
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      vpc: props.network.vpc,
      securityGroup: instanceSecurityGroup,
      machineImage: ec2.MachineImage.genericLinux({
        "us-east-1": props.config.GitlabAmi,
      }),
      role: gitlabEc2Role,
      blockDevices: [rootVolume],
    });    

    const userDataScript = readFileSync("./src/scripts/user-data.sh", "utf8");
    const modifiedUserData = userDataScript.replace(/###gitlab_host###/g, `git.${props.config.R53HostedZoneName}`);
    gitlabHost.addUserData(modifiedUserData);

    // create ALB
    const gitlabAlb = new alb.ApplicationLoadBalancer(this, `${props.config.AppPrefix}-gitlab-alb`, {
      vpc: props.network.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      loadBalancerName: `${props.config.AppPrefix}-gitlab-alb`,
      securityGroup: albSecurityGroup,
      internetFacing: true,
    });
    // Save load balancer access logs to S3
    gitlabAlb.logAccessLogs(props.accessLogBucket);


    // Access from ALB
    instanceSecurityGroup.connections.allowFrom(
      new ec2.Connections({
        securityGroups: [albSecurityGroup],
      }),
      ec2.Port.tcp(80),
      "allow traffic on Load Balancer"
    );

    // Direct Access to instance
    for (const ip of props.config.AllowedIPs) {
      instanceSecurityGroup.addIngressRule(
        ec2.Peer.ipv4(ip),
        ec2.Port.tcp(80),
        "allow Direct HTTP traffic from Allowed IP"
      );
    }

    // EC2 Instance Connect for us-east-1.
    // See https://ip-ranges.amazonaws.com/ip-ranges.json for the latest ranges
    // for the EC2_INSTANCE_CONNECT service.
    instanceSecurityGroup.addIngressRule(
      ec2.Peer.ipv4("18.206.107.24/29"),
      ec2.Port.tcp(22),
      "allow EC2 Instance Connect for us-east-1"
    );

    // Add Access to ALB
    for (const ip of props.config.AllowedIPs) {
      albSecurityGroup.addIngressRule(ec2.Peer.ipv4(ip), ec2.Port.tcp(443), "allow HTTPS access from Allowed IPs");
      albSecurityGroup.addIngressRule(ec2.Peer.ipv4(ip), ec2.Port.tcp(80), "allow HTTP access from Allowed IPs");
    }
    albSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.network.vpc.vpcCidrBlock),
      ec2.Port.tcp(443),
      "allow HTTPS traffic from Internal CIDR"
    );
    albSecurityGroup.connections.allowFrom(
      new ec2.Connections({
        securityGroups: [gitlabRunnerSecurityGroup],
      }),
      ec2.Port.tcp(443),
      "allow HTTPS traffic from GitLab runners"
    );

    albSecurityGroup.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), "Allow non-secure connection to anywhere");
    albSecurityGroup.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), "Allow secure connection to anywhere");

    for (let i = 0; i < props.network.publicEIPref.length; i++) {
      const ip = props.network.publicEIPref[i];
      albSecurityGroup.addIngressRule(ec2.Peer.ipv4(ip + "/32"), ec2.Port.tcp(443), "Allow Access From NAT Gateway");
    }

    // Allow access from natgateway
    // props.network.publicAllocationIds.forEach(ip=> {
    //   albSecurityGroup.addIngressRule(ec2.Peer.ipv4(ip + "/32"), ec2.Port.tcp(443), 'Allow Access From NAT Gateway')
    // })

    // Setup nice A Record to access gitlab
    new route53.ARecord(this, `${props.config.AppPrefix}-r53-aliasrecord`, {
      zone: props.hostedZone.hostedZone,
      target: route53.RecordTarget.fromAlias(new route53Targets.LoadBalancerTarget(gitlabAlb)),
      comment: "Alias to point to Backstage application ALB",
      recordName: "git",
      deleteExisting: true,
      ttl: cdk.Duration.minutes(5),
    });

    // Add a redirect listener for 80 -> 443 to ensure secure communication
    gitlabAlb.addRedirect({ open: false });
    // The SSL listener routes requests to the fargate service's tasks
    const httpsListener = gitlabAlb.addListener(`${props.config.AppPrefix}-alb-httpsListener`, {
      protocol: alb.ApplicationProtocol.HTTPS,
      open: false,
      certificates: [props.hostedZone.certificate],
    });
    httpsListener.addTargets(`${props.config.AppPrefix}-targetgrp`, {
      protocol: alb.ApplicationProtocol.HTTP,
      targetGroupName: `${props.config.AppPrefix}-git-targetgrp`,
      targets: [new albTargets.InstanceTarget(gitlabHost, 80)],
      healthCheck: {
        enabled: true,
        healthyHttpCodes: "302",
        path: "/",
        timeout: cdk.Duration.seconds(5),
      },
    });
    httpsListener.connections.addSecurityGroup(props.network.allowedIpsSg);

    this.loadbalancer = gitlabAlb;
  }
}
