// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as elb from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as elbTargets from "aws-cdk-lib/aws-elasticloadbalancingv2-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import { ISecret } from "aws-cdk-lib/aws-secretsmanager";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";
import { readFileSync } from "fs";
import { HostedZoneConstruct, NetworkConstruct, OPAEnvironmentParams } from "@aws/aws-app-development-common-constructs";

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface GitlabHostingConstructProps extends cdk.StackProps {
  readonly opaEnv: OPAEnvironmentParams;
  readonly network: NetworkConstruct;
  readonly GitlabAmi?: Record<string, string>;
  readonly accessLogBucket: s3.IBucket;
  readonly instanceDiskSize: number;
  readonly instanceSize: ec2.InstanceSize;
  readonly instanceClass: ec2.InstanceClass;
  readonly allowedIPs?: string[];
  readonly hostedZone?: HostedZoneConstruct;
  readonly gitlabSecret: ISecret;
}

const defaultProps: Partial<GitlabHostingConstructProps> = {};

// Userdata script log locations:
// /var/log/cloud-init.log and
// /var/log/cloud-init-output.log
/**
 * Deploys the GitlabHosting construct
 */
export class GitlabHostingConstruct extends Construct {
  // public readonly loadBalancer: elb.ApplicationLoadBalancer;
  public readonly alb: elb.ApplicationLoadBalancer;
  public readonly gitlabRunnerSecurityGroup: ec2.SecurityGroup;
  public readonly gitlabHostName: string;

  constructor(parent: Construct, name: string, props: GitlabHostingConstructProps) {
    super(parent, name);

    /* eslint-disable @typescript-eslint/no-unused-vars */
    props = { ...defaultProps, ...props };

    const instanceSecurityGroup = new ec2.SecurityGroup(this, "gitlab-instance-sg", { vpc: props.network.vpc });
    const albSecurityGroup = new ec2.SecurityGroup(this, "gitlab-alb-sg", { vpc: props.network.vpc });

    new ssm.StringParameter(this, `${props.opaEnv.prefix}-gitlab-security-group`, {
      allowedPattern: ".*",
      description: `The Gitlab LB Security Group`,
      parameterName: `/${props.opaEnv.prefix}/gitlab-security-group`,
      stringValue: albSecurityGroup.securityGroupId,
    });

    const glRunnerSgName = `${props.opaEnv.prefix}-alb-gitlab-runner-sg`;
    const gitlabRunnerSecurityGroup = new ec2.SecurityGroup(this, glRunnerSgName, {
      vpc: props.network.vpc,
      securityGroupName: glRunnerSgName,
    });
    cdk.Tags.of(gitlabRunnerSecurityGroup).add("Name", glRunnerSgName);
    this.gitlabRunnerSecurityGroup = gitlabRunnerSecurityGroup;
   

    const gitlabIamRolePolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          resources: [
            `${props.gitlabSecret.secretArn}*`
          ],
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

    NagSuppressions.addResourceSuppressions(gitlabEc2Role, [
      { id: "AwsSolutions-IAM4", reason: "Assumed roles will use AWS managed policies for demonstration purposes.  Customers will be advised/required to assess and apply custom policies based on their role requirements" },
      { id: "AwsSolutions-IAM5", reason: "Assumed roles will require permissions to perform multiple ecs, ddb, and ec2 for demonstration purposes.  Customers will be advised/required to assess and apply minimal permission based on role mappings to their idP groups" },
    ], true);

    const rootVolume: ec2.BlockDevice = {
      deviceName: "/dev/sda1",
      volume: ec2.BlockDeviceVolume.ebs(props.instanceDiskSize, {
        encrypted: true,
        volumeType: ec2.EbsDeviceVolumeType.GP3,
      }),
    };

    // Get the latest Ubuntu machine image map
    // Defaults will use "jammy" (22.04) on x86_64, but can be overridden with env vars
    const UBUNTU_OWNER_ID = "099720109477"; // The official owner ID for Canonical-owned images
    const ubuntuName = process.env.UBUNTU_NAME || "jammy";
    // const ubuntuVersion = getEnvVarValue(process.env.UBUNTU_VERSION) || "22.04";
    const ubuntuArch = process.env.UBUNTU_ARCH || ec2.InstanceArchitecture.X86_64;
    const ubuntuLookupProps = {
      // `YEAR-ARCH` are the first two stars
      name: `ubuntu/images/hvm-ssd/ubuntu-${ubuntuName}-*-*-server-*`,
      owners: [UBUNTU_OWNER_ID],
      filters: {
        architecture: [ubuntuArch],
        "image-type": ["machine"],
        state: ["available"],
        "root-device-type": ["ebs"],
        "virtualization-type": ["hvm"],
      },
    }
    // short-circuit the creation of the amiMap if one was passed in via properties; otherwise lookup using the props above
    const linuxAmiMap = props.GitlabAmi || { [props.opaEnv.awsRegion]: new ec2.LookupMachineImage(ubuntuLookupProps).getImage(this).imageId }
    const machineImage = ec2.MachineImage.genericLinux(linuxAmiMap);

    const gitlabHost = new ec2.Instance(this, "GitlabHost", {
      instanceName: `${props.opaEnv.prefix}-GitlabHost`,
      instanceType: ec2.InstanceType.of(props.instanceClass, props.instanceSize),
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      vpc: props.network.vpc,
      securityGroup: instanceSecurityGroup,
      machineImage,
      role: gitlabEc2Role,
      blockDevices: [rootVolume],
      requireImdsv2: true,
    });
    new cdk.CfnOutput(this, "GitlabAmiOutput", {
      value: JSON.stringify(linuxAmiMap),
      description: "The AMI ID used for the GitLab instance",
    });
    
    NagSuppressions.addResourceSuppressions(gitlabHost, [
      { id: 'AwsSolutions-EC28', reason: 'Gitlab is a 3rd party scm used by the prototype to simulate customer environment.  Customer environment will not use EC2 and, therefore, detailed monitoring and incurring extra cost is not required.' },
      { id: 'AwsSolutions-EC29', reason: 'Gitlab is a 3rd party scm used by the prototype to simulate customer environment.  Autoscaling is not required, nor appropriate for this scm implementation.' },
    ]);


    const userDataScript = readFileSync("./src/scripts/user-data.sh", "utf8");
    gitlabHost.addUserData(userDataScript);

    // create ALB
    const gitlabAlb = new elb.ApplicationLoadBalancer(this, `${props.opaEnv.prefix}-gitlab-alb`, {
      vpc: props.network.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      loadBalancerName: `${props.opaEnv.prefix}-gitlab-alb`,
      securityGroup: albSecurityGroup,
      internetFacing: true,
      // dropInvalidHeaderFields: true,
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

    // allow access from internal VPC
    instanceSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.network.vpc.vpcCidrBlock),
      ec2.Port.tcp(80),
      "allow traffic from vpc"
    );

    // Add Access to ALB
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

    for (const ip of props.network.publicEIPref) {
      albSecurityGroup.addIngressRule(ec2.Peer.ipv4(ip + "/32"), ec2.Port.tcp(80), "Allow Access From NAT Gateway");
      albSecurityGroup.addIngressRule(ec2.Peer.ipv4(ip + "/32"), ec2.Port.tcp(443), "Allow Access From NAT Gateway");
    }
    let lbDNSParam: ssm.StringParameter;
    let lbUrlParam: ssm.StringParameter;

    // Setup nice A Record to access gitlab
    const aRecord = new route53.ARecord(this, `${props.opaEnv.prefix}-r53-aliasrecord`, {
      zone: props.hostedZone?.hostedZone!,
      target: route53.RecordTarget.fromAlias(new route53Targets.LoadBalancerTarget(gitlabAlb)),
      comment: "Alias to point to Backstage git ALB",
      recordName: "git",
      deleteExisting: true,
      ttl: cdk.Duration.minutes(5),
    });

    // Add a redirect listener for 80 -> 443 to ensure secure communication
    gitlabAlb.addRedirect({ open: false });

    //Configure private Load Balancer Listener
    const httpsListener = gitlabAlb.addListener(`${props.opaEnv.prefix}-alb-httpsListener`, {
      protocol: elb.ApplicationProtocol.HTTPS,
      open: false,
      certificates: [props.hostedZone?.certificate!],
    });

    httpsListener.addTargets(`${props.opaEnv.prefix}-target-grp2`, {
      protocol: elb.ApplicationProtocol.HTTP,
      targetGroupName: `${props.opaEnv.prefix}-git-target-grp2`,
      targets: [new elbTargets.InstanceTarget(gitlabHost, 80)],
      healthCheck: {
        enabled: true,
        protocol: elb.Protocol.HTTP,
        port: "80",
        healthyHttpCodes: "302",
        path: "/",
        timeout: cdk.Duration.seconds(5),
      },
    });
    httpsListener.connections.addSecurityGroup(props.network.allowedIpsSg);

    // lbDNSParam = new ssm.StringParameter(this, `${props.opaEnv.prefix}-gitlab-hostname`, {
    //   allowedPattern: ".*",
    //   description: `The Gitlab Hostname for OPA Platform`,
    //   parameterName: `/${props.opaEnv.prefix}/gitlab-hostname`,
    //   stringValue: aRecord.domainName,
    // });

    // lbUrlParam = new ssm.StringParameter(this, `${props.opaEnv.prefix}-gitlab-url`, {
    //   allowedPattern: ".*",
    //   description: `The Gitlab URL for OPA Platform`,
    //   parameterName: `/${props.opaEnv.prefix}/gitlab-url`,
    //   stringValue: "https://" + aRecord.domainName,
    // });

    this.gitlabHostName = aRecord.domainName;

    // allow traffic to the ALB from the restricted IP security group
    gitlabAlb.connections.addSecurityGroup(props.network.allowedIpsSg);

    // new cdk.CfnOutput(this, `GitLab loadBalancer Domain Name Param`, {
    //   value: lbDNSParam.parameterName,
    // });
    // new cdk.CfnOutput(this, `GitLab loadBalancer URL Param`, {
    //   value: lbUrlParam.parameterName,
    // });
    this.alb = gitlabAlb;
  }
}
