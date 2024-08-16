// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { aws_ecs_patterns as ecsPatterns, StackProps } from "aws-cdk-lib";

import { HostedZoneConstruct, NetworkConstruct, OPAEnvironmentParams } from "@aws/aws-app-development-common-constructs";

import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as elb from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";
import * as rds from "aws-cdk-lib/aws-rds";
import * as s3 from "aws-cdk-lib/aws-s3";
import { ISecret, Secret } from "aws-cdk-lib/aws-secretsmanager";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";

export type EnvVar = { [key: string]: string };
export type SecretVar = { [key: string]: ecs.Secret };

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface BackstageFargateServiceConstructProps extends StackProps {
  /**
   * The NetworkConstruct which provides the vpc and restricted IP security group references
   */
  readonly network: NetworkConstruct;
  /**
   * The ECR repository where Backstage docker images are pulled from for the service task's containers
   */
  readonly ecrRepository: ecr.IRepository;
  /**
   * A reference to the KMS key if the ECR repository has been encrypted
   * with a customer-managed key
   */
  readonly ecrKmsKey?: kms.IKey;
  /**
   * A reference to the S3 bucket to use for access log storage
   */
  readonly accessLogBucket: s3.IBucket;
  /**
   * The DatabaseCluster that the service will need to connect to
   */
  readonly dbCluster: rds.DatabaseCluster;
  /**
   * The OPA infrastructure configuration
   */
  readonly opaEnv: OPAEnvironmentParams;
  /**
   * A reference to the Secrets Manager secret where Okta secrets are held
   */
  readonly oktaSecret: ISecret;
  /**
   * A reference to the Secrets Manager secret where Gitlab Admin secrets are held
   */
  gitlabAdminSecret?: ISecret;
  /**
   * An IAM role used for the service's tasks to have proper permission to
   * required AWS resources
   */
  githubAdminSecret?: ISecret;
  /**
  * A reference to the Secrets Manager secret where Harness.io secrets are held
  */
  readonly taskRole: iam.Role;
  /**
   * A set of key:value pairs to be used as environment variables in the
   * container task.  Do NOT add sensitive information in environment variables.
   * Sensitive information should be stored in SecretsManager and included
   * in the `secrets` parameter.
   */
  readonly envVars?: EnvVar;
  /**
   * A collection of additional secrets from Secret manager to be referenced
   * by the task containers when starting up.
   */
  readonly secretVars?: SecretVar;
  readonly gitlabHostname: string;
  readonly githubHostname: string;
  readonly hostedZone?: HostedZoneConstruct;

  /**
   * The name of the Backstage hosting organization
   */
  readonly customerName: string;

  /**
   * URL to the Backstage hosting organization logo
   */
  readonly customerLogo: string;

  /**
   * URL to the icon of the Backstage hosting organization logo
   */
  readonly customerLogoIcon: string;
    /**
   * A reference to the Secrets Manager secret where the automation key is stored
   */
    readonly automationSecret?: ISecret;
}

const defaultProps: Partial<BackstageFargateServiceConstructProps> = {
  envVars: {},
  secretVars: {},
};

/**
 * A BackstageFargateServiceConstruct construct will create all AWS resources required
 * to run a service on ECS Fargate fronted by an application load balancer with
 * SSL communication.
 */
export class BackstageFargateServiceConstruct extends Construct {
  public readonly cluster: ecs.ICluster;
  public readonly loadBalancer: elb.ApplicationLoadBalancer;
  public readonly lbSSMParam: ssm.StringParameter;

  constructor(scope: Construct, id: string, props: BackstageFargateServiceConstructProps) {
    super(scope, id);

    /* eslint-disable @typescript-eslint/no-unused-vars */
    props = { ...defaultProps, ...props };

    // Create a secret to be used by service to service auth within Backstage.
    // See https://backstage.io/docs/auth/service-to-service-auth
    const backstageSecret = new Secret(this, `${props.opaEnv.prefix}-backstage-appsecret`, {
      secretName: `${props.opaEnv.prefix}-backstage-appsecret`,
    });

    NagSuppressions.addResourceSuppressions([backstageSecret], [
      { id: "AwsSolutions-SMG4", reason: "Application secret for service-to-service auth and cannot be automatically rotated" },
    ]);

    const cluster = new ecs.Cluster(this, "backstage-solution-cluster", {
      vpc: props.network.vpc,
      containerInsights: true,
    });

    let albFargateService: ecsPatterns.ApplicationLoadBalancedFargateService;
    let lbDNSParam: ssm.StringParameter;

    lbDNSParam = new ssm.StringParameter(this, `${props.opaEnv.prefix}-backstage-hostname`, {
      allowedPattern: ".*",
      description: `The Gitlab Hostname for OPA Platform`,
      parameterName: `/${props.opaEnv.prefix}/backstage-hostname`,
      stringValue: "https://" + props.hostedZone?.rootDnsName,
    });

    // Create an object of the plain text environment variables
    const envVars = {
      POSTGRES_HOST: props.dbCluster.clusterEndpoint.hostname,
      POSTGRES_PORT: `${props.dbCluster.clusterEndpoint.port}`,
      BACKSTAGE_TITLE: "OPA",
      BACKSTAGE_ORGNAME: "OPA",
      PROTOCOL: "https",
      BACKSTAGE_HOSTNAME: `${props.hostedZone?.rootDnsName}`,
      GITLAB_HOSTNAME: `${props.gitlabHostname}`,
      GITHUB_HOSTNAME: `${props.githubHostname}`,
      BACKSTAGE_PORT: "443",
      NODE_ENV: "production",
      CUSTOMER_NAME: `${props.customerName}`,
      CUSTOMER_LOGO: `${props.customerLogo}`,
      CUSTOMER_LOGO_ICON: `${props.customerLogoIcon}`,
      AWS_REGION: `${props.opaEnv.awsRegion}`,
      AWS_ACCOUNT_ID: `${props.opaEnv.awsAccount}`,
    }

    // Create an object of the secret environment variables
    let secretVars: { [key: string]: ecs.Secret } = {
      POSTGRES_USER: ecs.Secret.fromSecretsManager(props.dbCluster.secret!, "username"),
      POSTGRES_PASSWORD: ecs.Secret.fromSecretsManager(props.dbCluster.secret!, "password"),
      OKTA_ORG_URL: ecs.Secret.fromSecretsManager(props.oktaSecret, "audience"),
      OKTA_CLIENT_ID: ecs.Secret.fromSecretsManager(props.oktaSecret, "clientId"),
      OKTA_CLIENT_SECRET: ecs.Secret.fromSecretsManager(props.oktaSecret, "clientSecret"),
      OKTA_API_TOKEN: ecs.Secret.fromSecretsManager(props.oktaSecret, "apiToken"),
      BACKSTAGE_SECRET: ecs.Secret.fromSecretsManager(backstageSecret),
    }

    if (props.gitlabAdminSecret) {
      secretVars.GITLAB_ADMIN_TOKEN = ecs.Secret.fromSecretsManager(props.gitlabAdminSecret, "apiToken");
    }

    if (props.githubAdminSecret) {
      secretVars.GITHUB_ADMIN_TOKEN = ecs.Secret.fromSecretsManager(props.githubAdminSecret, "apiToken");
    }

    // Add the automation secret if it exists.
    if (props.automationSecret) {
      secretVars.AUTOMATION_KEY = ecs.Secret.fromSecretsManager(props.automationSecret);
    }

    albFargateService = new ecsPatterns.ApplicationLoadBalancedFargateService(
      this,
      `${props.opaEnv.prefix}-backstage`,
      {
        cluster,
        enableExecuteCommand: true,
        redirectHTTP: true,
        protocol: elb.ApplicationProtocol.HTTPS,
        taskImageOptions: {
          image: ecs.ContainerImage.fromEcrRepository(props.ecrRepository),
          environment: envVars,
          secrets: secretVars,
          containerPort: 8080,
          taskRole: props.taskRole,
        },
        openListener: false,
        memoryLimitMiB: 2048,
        cpu: 512,
        domainZone: props.hostedZone?.hostedZone,
        domainName: props.hostedZone?.hostedZone.zoneName,
      }
    );

    const cfnEcsService = albFargateService.service.node.defaultChild as ecs.CfnService;
    cfnEcsService.desiredCount = 0;
    
    // Store the backstage service name as an SSM Parameter
    const serviceNameParam = new ssm.StringParameter(this, `${props.opaEnv.prefix}-backstage-service-name`, {
      stringValue: albFargateService.service.serviceName,
      parameterName: `/${props.opaEnv.prefix}/backstage-service-name`,
    });
    // Store the backstage ALB arn as an SSM Parameter
    const albArnParam = new ssm.StringParameter(this, `${props.opaEnv.prefix}-backstage-alb-arn`, {
      stringValue: albFargateService.loadBalancer.loadBalancerArn,
      parameterName: `/${props.opaEnv.prefix}/backstage-alb-arn`,
    });

    NagSuppressions.addResourceSuppressions(albFargateService.taskDefinition, [
      { id: "AwsSolutions-ECS2", reason: "Task environment variables are not sensitive.  When changed, a new task def will be required for a new container" },
      { id: "AwsSolutions-IAM5", reason: "Task def exec role restricts access to the repository via additional policies, but requires multiple resources access to GetAuthorizationToken.", appliesTo: ['Resource::*'] },
    ], true);

    // Save load balancer access logs to S3
    albFargateService.loadBalancer.logAccessLogs(props.accessLogBucket);

    // Ensure that the task can decrypt images in an encrypted repository
    if (props.ecrKmsKey) {
      props.ecrKmsKey.grantDecrypt(albFargateService.taskDefinition.executionRole!);
    }

    // Ensure that the DB security group allows access from the fargate service's SG
    props.dbCluster.connections.allowDefaultPortFrom(albFargateService.service, "from fargate service");

    // allow traffic to the ALB from the restricted IP security group
    albFargateService.loadBalancer.connections.addSecurityGroup(props.network.allowedIpsSg);

    this.loadBalancer = albFargateService.loadBalancer;
    this.lbSSMParam = lbDNSParam;
    this.cluster = cluster;
  }
}
