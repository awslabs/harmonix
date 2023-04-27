// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

import * as autoscaling from "aws-cdk-lib/aws-autoscaling";
import { BlockDeviceVolume } from "aws-cdk-lib/aws-autoscaling";
import { readFileSync } from "fs";
import { BackstageInfraConfig } from "../helpers/infra-config";

export interface EipLookupInfo {
  readonly attrPublicIp: string;
  readonly attrAllocationId: string;
}

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface GitlabRunnerConstructProps extends cdk.StackProps {
  readonly config: BackstageInfraConfig;
  readonly vpc: cdk.aws_ec2.IVpc;
  readonly runnerSg: cdk.aws_ec2.ISecurityGroup;
}

const defaultProps: Partial<GitlabRunnerConstructProps> = {};

/**
 * Deploys the GitlabRunnerConstruct construct
 */
export class GitlabRunnerConstruct extends Construct {

  constructor(parent: Construct, name: string, props: GitlabRunnerConstructProps) {
    super(parent, name);

    /* eslint-disable @typescript-eslint/no-unused-vars */
    props = { ...defaultProps, ...props };

    const glRunnerEc2SgName = `${props.config.AppPrefix}-gitlab-runner-sg`;
    const instanceSecurityGroup = new ec2.SecurityGroup(this, glRunnerEc2SgName, { vpc: props.vpc });
    cdk.Tags.of(instanceSecurityGroup).add("Name", glRunnerEc2SgName);

    const gitlabIamRolePolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          resources: ["*"],
          actions: ["kms:GenerateDataKey", "kms:Decrypt"],
        }),

        new iam.PolicyStatement({
          resources: [
            `arn:aws:secretsmanager:${props.config.Region}:${props.config.Account}:secret:baws-admin-gitlab-secrets-??????`,
          ],
          actions: [
            "secretsmanager:DescribeSecret",
            "secretsmanager:GetSecretValue",
            "secretsmanager:GetSecretValue",
            "secretsmanager:PutSecretValue",
          ],
        }),

        // Allow GitLab Runner to build and publish app images to ECR
        new iam.PolicyStatement({
          resources: ["*"],
          actions: [
            "ecr:GetAuthorizationToken",
            "ecr:CompleteLayerUpload",
            "ecr:UploadLayerPart",
            "ecr:InitiateLayerUpload",
            "ecr:BatchCheckLayerAvailability",
            "ecr:PutImage",
          ],
        }),

        // Allow GitLab Runner to put build artifacts in S3
        new iam.PolicyStatement({
          actions: [
            "s3:PutObject",
          ],
          effect: iam.Effect.ALLOW,
          resources: ["*"],
          conditions: {
            "StringEquals": {
              "aws:ResourceAccount": props.config.Account
            }
          }
        }),
      ],
    });

    const gitlabEc2Role = new iam.Role(this, "GitlabRunnerIamRole", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      description: "Iam Role assumed by the Gitlab Runner",
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("CloudWatchAgentAdminPolicy"),
      ],
      inlinePolicies: { GitlabIamRolePolicy: gitlabIamRolePolicy },
    });

    const blockDevice: autoscaling.BlockDevice = {
      deviceName: "/dev/sda1",
      volume: BlockDeviceVolume.ebs(200, {
        encrypted: true,
      }),
    };

    const userData = ec2.UserData.forLinux();
    const userDataScript = readFileSync("./src/scripts/gitlab-runner-user-data.sh", "utf8");
    let modifiedUserData = userDataScript.replace(/###gitlab_host###/g, `git.${props.config.R53HostedZoneName}`);
    modifiedUserData = modifiedUserData.replace(/###gitlab_secret###/g, props.config.GitlabSecret);
    userData.addCommands(modifiedUserData);

    const autoScalingGroup = new autoscaling.AutoScalingGroup(this, "GitLabRunnerAutoScalingGroup", {
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      blockDevices: [blockDevice],
      machineImage: ec2.MachineImage.genericLinux({
        "us-east-1": "ami-0557a15b87f6559cf",
      }),
      allowAllOutbound: true,
      role: gitlabEc2Role,
      healthCheck: autoscaling.HealthCheck.ec2(),
      minCapacity: 1,
      maxCapacity: 1,
      securityGroup: instanceSecurityGroup,
      userData,
    });

    autoScalingGroup.addSecurityGroup(props.runnerSg);
  }
}
