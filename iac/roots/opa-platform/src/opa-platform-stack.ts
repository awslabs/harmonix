// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  DynamoDBConstruct,
  HostedZoneConstruct,
  NetworkConstruct,
  OPAEnvironmentParams,
  RdsConstruct,
  Wafv2BasicConstruct,
  WafV2Scope
} from "@aws/aws-app-development-common-constructs";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { BackstageFargateServiceConstruct } from "./constructs/backstage-fargate-service-construct";
import { GitlabHostingConstruct } from "./constructs/gitlab-hosting-construct";
import { GitlabRunnerConstruct } from "./constructs/gitlab-runner-construct";
import { OPARootRoleConstruct } from "./constructs/opa-role-construct";
import { ScmAndPipelineInfoConstruct } from "./constructs/scm-and-pipeline-info-construct";

import { NagSuppressions } from "cdk-nag";

function getEnvVarValue(envVar: string | undefined): string {
  if (!envVar || envVar === "blank") {
    return "";
  }
  return envVar;
}

export interface OPAPlatformStackProps extends cdk.StackProps {
  // readonly config: BackstageInfraConfig;
}

export class OPAPlatformStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: OPAPlatformStackProps) {
    super(scope, id, props);

    const sAllowedIPs = getEnvVarValue(process.env.ALLOWED_IPS);
    const allowedIPs = sAllowedIPs?.split(",").map((s) => {
      return s.trim();
    }) || [];

    // Creating environment params
    const opaParams: OPAEnvironmentParams = {
      envName: "platform",
      awsRegion: getEnvVarValue(process.env.AWS_DEFAULT_REGION) || "us-east-1",
      awsAccount: getEnvVarValue(process.env.AWS_ACCOUNT_ID || this.account),
      prefix: getEnvVarValue(process.env.PREFIX) || "opa",
    };

    // Create encryption key for all data at rest encryption
    const key = new kms.Key(this, `${opaParams.prefix}-key`, {
      alias: `${opaParams.prefix}-key`,
      enableKeyRotation: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pendingWindow: cdk.Duration.days(8),
    });

    // save KMS key arn in an SSM Parameter
    new ssm.StringParameter(this, `${opaParams.prefix}-key-param`, {
      allowedPattern: ".*",
      description: "The KMS Key for OPA Solution",
      parameterName: `/${opaParams.prefix}/kms-key`,
      stringValue: key.keyArn,
    });
    
    // Lookup secret created by build-script/secure-secrets-creation.sh
    const oktaSecret = secretsmanager.Secret.fromSecretNameV2(this, `${opaParams.prefix}-key-okta-secrets`, process.env.OKTA_SECRET_NAME as string);
    const gitlabSecret = secretsmanager.Secret.fromSecretNameV2(this, `${opaParams.prefix}-key-gitlab-admin-secrets`, process.env.GITLAB_SECRET_NAME as string);

    const scmAndPipelineInfoConstruct = new ScmAndPipelineInfoConstruct(this, `${opaParams.prefix}-git-info`, {
      opaEnv: opaParams,
      key,
      gitlabHostName: getEnvVarValue(process.env.GITLAB_HOSTNAME),
      gitlabUrl:`https://${getEnvVarValue(process.env.GITLAB_HOSTNAME)}`,
      githubHostName: getEnvVarValue(process.env.GITHUB_HOSTNAME),
      githubUrl: `https://${getEnvVarValue(process.env.GITHUB_HOSTNAME)}`
    });
    
    // Create an ECR repository to contain backstage container images
    const ecrRepository = new ecr.Repository(this, `${opaParams.prefix}-ecr-repository`, {
      repositoryName: `${opaParams.prefix}-backstage`,
      imageScanOnPush: true,
      encryption: ecr.RepositoryEncryption.KMS,
      encryptionKey: key,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
    });

    // Save ECR Repo in an SSM Parameter
    const backstageECRParam = new ssm.StringParameter(this, `${opaParams.prefix}-backstage-ecr-param`, {
      allowedPattern: ".*",
      description: "The ECR Key for Backstage Solution",
      parameterName: `/${opaParams.prefix}/backstage-ecr`,
      stringValue: ecrRepository.repositoryName,
    });

    // Create VPC for hosting backstage
    const network = new NetworkConstruct(this, "Backstage-Network", {
      opaEnv: opaParams,
      cidrRange: "10.0.0.0/16",
      isIsolated: false,
      allowedIPs,
      publicVpcNatGatewayCount: +(getEnvVarValue(process.env.NUM_PUBLIC_NATGW) || 3),
      vpcAzCount: +(getEnvVarValue(process.env.NUM_AZ) || 3),
    });

    // Create DB for backstage platform
    const rdsConstruct = new RdsConstruct(this, "rds-construct", {
      opaEnv: opaParams,
      vpc: network.vpc,
      kmsKey: key,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.R6G, ec2.InstanceSize.XLARGE),
    });

    // Create Solution DynamoDB Tables - SecurityRoleMapping
    const securityMappingTableConstruct = new DynamoDBConstruct(this, "security-mapping-table", {
      opaEnv: opaParams,
      tableName: "SecurityMappingTable",
      kmsKey: key,
    });

    // Create Master role
    const backstageRootRole = new OPARootRoleConstruct(this, "backstage-master-role", {
      opaEnv: opaParams,
      securityTableName: securityMappingTableConstruct.table.tableName,
      KMSkey: key,
      network,
    });

    const customerName = getEnvVarValue(process.env.CUSTOMER_NAME) || "AWS";
    const customerLogo = getEnvVarValue(process.env.CUSTOMER_LOGO) || "https://companieslogo.com/img/orig/AMZN_BIG-accd00da.png";
    const customerLogoIcon = getEnvVarValue(process.env.CUSTOMER_LOGO_ICON) || "https://companieslogo.com/img/orig/AMZN.D-13fddc58.png";

    let gitlabHostingConstruct: GitlabHostingConstruct;
    let hostedZone: HostedZoneConstruct;
    let backstageConstruct: BackstageFargateServiceConstruct;

    const hostedZoneName = getEnvVarValue(process.env.R53_HOSTED_ZONE_NAME) || "";
    if (!hostedZoneName) {
      throw new Error("R53_HOSTED_ZONE_NAME variable must be set");
    }

    hostedZone = new HostedZoneConstruct(this, "hostedZoneMain", {
      opaEnv: opaParams,
      R53HostedZoneName: hostedZoneName,
    });


    // Create SSM Parameter to store the desired GitLab version
    const gitlabVersionParam = new ssm.StringParameter(this, `${opaParams.prefix}-gitlab-version`, {
        allowedPattern: ".*",
        description: "The desired version of GitLab",
        parameterName: `/${opaParams.prefix}/gitlab-version`,
        stringValue: getEnvVarValue(process.env.GITLAB_VERSION) || "latest",
      });

    // Create a secured EC2 Hosted Gitlab
    gitlabHostingConstruct = new GitlabHostingConstruct(this, "GitlabHosting-Construct", {
      opaEnv: opaParams,
      network: network,
      accessLogBucket: network.logBucket,
      instanceDiskSize: 3000,
      instanceSize: ec2.InstanceSize.XLARGE,
      instanceClass: ec2.InstanceClass.C5,
      hostedZone: hostedZone,
      gitlabSecret,
    });
    gitlabHostingConstruct.node.addDependency(gitlabSecret);
    gitlabHostingConstruct.node.addDependency(gitlabVersionParam);

    const shouldCreateAutomationSecret: boolean = getEnvVarValue(process.env.CREATE_AUTOMATION_SECRET).toLocaleLowerCase() === "true";
    let automationSecret: secretsmanager.Secret | undefined;
    if (shouldCreateAutomationSecret) {
      automationSecret = new secretsmanager.Secret(this, `${opaParams.prefix}-automation-secret`, {
        generateSecretString: { passwordLength: 32, excludePunctuation:true },
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        secretName: `${opaParams.prefix}-${opaParams.envName}-automation-secret`,
        encryptionKey: key,
      });

      NagSuppressions.addResourceSuppressions(automationSecret, [
        {
          id: "AwsSolutions-SMG4",
          reason:
            "Rotation is not nessacry .",
        },
      ]);
    }

    

    backstageConstruct = new BackstageFargateServiceConstruct(this, `${opaParams.prefix}-fargate-service`, {
      network: network,
      opaEnv: opaParams,
      ecrRepository,
      ecrKmsKey: key,
      accessLogBucket: network.logBucket,
      dbCluster: rdsConstruct.cluster,
      oktaSecret,
      gitlabAdminSecret: scmAndPipelineInfoConstruct.gitlabSecret,
      githubAdminSecret: scmAndPipelineInfoConstruct.githubSecret,
      taskRole: backstageRootRole.IAMRole,
      gitlabHostname: scmAndPipelineInfoConstruct.gitlabHostNameParam?.stringValue || "",
      githubHostname: scmAndPipelineInfoConstruct.githubHostNameParam?.stringValue || "",
      hostedZone,
      customerName,
      customerLogo,
      customerLogoIcon,
      automationSecret,
    });

    // Create EC2 Gitlab Runner
    const gitlabRunner = new GitlabRunnerConstruct(this, "GitlabRunner-Construct", {
      opaEnv: opaParams,
      network,
      runnerSg: gitlabHostingConstruct.gitlabRunnerSecurityGroup,
      gitlabSecret,
      instanceDiskSize: 3000,
      instanceSize: ec2.InstanceSize.XLARGE,
      instanceClass: ec2.InstanceClass.C5,
    });
    // wait till gitlab host is done.
    gitlabRunner.node.addDependency(gitlabHostingConstruct);

   

    // Attach the AdministratorAccess policy to the role if required
    
    const createEnvRole = getEnvVarValue(process.env.CREATE_ENV_PROVISIONING_ROLE);
    if (createEnvRole.toLowerCase() === 'true'){

      // create the environment provisioning role.
      const envProvisioningRole = new iam.Role(this, "EnvProvisioningRole", {
        assumedBy: new iam.CompositePrincipal(
          new iam.ArnPrincipal(backstageRootRole.IAMRole.roleArn),
          new iam.ArnPrincipal(gitlabRunner.gitlabEc2Role.roleArn)
        ),
        roleName: "opa-envprovisioning-role", // Optional: specify a role name
      });
      
      //TODO: Reduce permissions before release to PROD
      envProvisioningRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess"));

      NagSuppressions.addResourceSuppressions(envProvisioningRole, [
        {
          id: "AwsSolutions-IAM4",
          reason:
            "The power access policy is intentionally designed to grant full administrative access to AWS services for specific administrative roles. This use case has been reviewed and accepted by our security team.",
        },
      ]);

      // store the provisioning role arn to ssm
      new ssm.StringParameter(this, `${opaParams.prefix}-provisioning-role`, {
        allowedPattern: ".*",
        description: "This role is assumed by platform to provision environments",
        parameterName: `/${opaParams.prefix}/provisioning-role`,
        stringValue: envProvisioningRole.roleArn,
      });

      new cdk.CfnOutput(this, `${opaParams.prefix}-envprovisioning-role-arn`, {
        value: envProvisioningRole.roleArn,
        description: "Role will be assumed to provision environments",
      });
    }
    
    // Create a regional WAF Web ACL for load balancers
    const wafConstruct = new Wafv2BasicConstruct(this, `${opaParams.prefix}-regional-wafAcl`, {
      wafScope: WafV2Scope.REGIONAL,
      region: cdk.Stack.of(this).region,
    });

    // Associate the web ACL with load balancers
    wafConstruct.addResourceAssociation(
      `${opaParams.prefix}-backstage-alb-backstage-webacl-assoc`,
      backstageConstruct.loadBalancer.loadBalancerArn
    );

    wafConstruct.addResourceAssociation(
      `${opaParams.prefix}-gitlab-alb-git-webacl-assoc`,
      gitlabHostingConstruct.alb.loadBalancerArn
    );

    new cdk.CfnOutput(this, `${opaParams.prefix}-ecr-output`, {
      value: backstageECRParam.parameterName,
      description: "ECR repository for backstage platform images",
    });

    
  }
}
