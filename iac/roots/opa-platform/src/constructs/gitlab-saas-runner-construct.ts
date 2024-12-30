import { OPAEnvironmentParams } from "@aws/aws-app-development-common-constructs";
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";

export interface GitlabSaasRunnerConstructProps extends cdk.StackProps {
  readonly opaEnv: OPAEnvironmentParams;
}

const defaultProps: Partial<GitlabSaasRunnerConstructProps> = {};

export class GitlabSaasRunnerConstruct extends Construct {
  public iamRole: iam.Role;
  public iamOidcProvider: iam.OpenIdConnectProvider;
  private props: GitlabSaasRunnerConstructProps;

  constructor(
    parent: Construct,
    name: string,
    props: GitlabSaasRunnerConstructProps,
  ) {
    super(parent, name);

    /* eslint-disable @typescript-eslint/no-unused-vars */
    this.props = { ...defaultProps, ...props };

    const gitlabSaaSRunnerRolePolicy = new iam.PolicyDocument({
      statements: [
        // Allow Gitlab SaaS runner to encrypt/decrypt data
        new iam.PolicyStatement({
          resources: ["*"],
          effect: iam.Effect.ALLOW,
          actions: ["kms:GenerateDataKey", "kms:Decrypt"],
        }),
        // Allow Gitlab SaaS runner to ready and update secret value
        new iam.PolicyStatement({
          resources: ["*"],
          effect: iam.Effect.ALLOW,
          actions: [
            "secretsmanager:DescribeSecret",
            "secretsmanager:GetSecretValue",
            "secretsmanager:GetSecretValue",
            "secretsmanager:PutSecretValue",
          ],
        }),
        // Allow Gitlab SaaS runner to put build artifacts in S3
        new iam.PolicyStatement({
          actions: ["s3:PutObject"],
          effect: iam.Effect.ALLOW,
          resources: ["*"],
        }),
        // Allow GitLab SaaS runner to describe CloudFormation stacks
        new iam.PolicyStatement({
          actions: [
            "cloudformation:DescribeStacks",
            "cloudformation:ListStackResources",
          ],
          effect: iam.Effect.ALLOW,
          resources: ["*"],
          // conditions: {
          //   StringEquals: {
          //     "aws:ResourceAccount": props.backstageEnv.awsAccount,
          //   },
          // },
        }),
        // Allow Gitlab Runner to assume Environment provisioning roles
        // ATTENTION: in a production scenario, the gitlab runner policy below
        // should be updated to restrict the Resources to only the iam roles
        // that follow a naming convention in target accounts where infrastructure
        // will be provisioned.  For example:
        //    "arn:aws:iam::123456789012:role/opa-environment-provisioning-role"
        new iam.PolicyStatement({
          actions: ["sts:AssumeRole"],
          effect: iam.Effect.ALLOW,
          resources: ["*"],
        }),
      ],
    });

    this.iamOidcProvider = new iam.OpenIdConnectProvider(
      this,
      "gitlabOidcProvider",
      {
        clientIds: ["https://gitlab.com"],
        url: "https://gitlab.com",
      },
    );

    this.iamRole = new iam.Role(this, `${name}Role`, {
      assumedBy: new iam.OpenIdConnectPrincipal(this.iamOidcProvider, {}),
      roleName: `${name}Role`,
      description: "IAM role assumed by the Gitlab Runner",
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonSSMManagedInstanceCore",
        ),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "CloudWatchAgentAdminPolicy",
        ),
      ],
      inlinePolicies: { gitlabSaaSRunnerRolePolicy },
    });

    NagSuppressions.addResourceSuppressions(
      this.iamRole,
      [
        {
          id: "AwsSolutions-IAM4",
          reason:
            "Assumed roles will use AWS managed policies for demonstration purposes.  Customers will be advised/required to assess and apply custom policies based on their role requirements",
        },
        {
          id: "AwsSolutions-IAM5",
          reason:
            "Assumed roles will require permissions to perform multiple ecs, ddb, and ec2 for demonstration purposes.  Customers will be advised/required to assess and apply minimal permission based on role mappings to their idP groups",
        },
      ],
      true,
    );

    // save root role in a param
    const roleNameParam = new ssm.StringParameter(
      this,
      `${props.backstageEnv.prefix}PipelineRoleName`,
      {
        allowedPattern: ".*",
        description: `The OPA Platform Pipeline Role name`,
        parameterName: `/apps/${props.backstageEnv.prefix}/iam/role/pipeline/name`,
        stringValue: this.iamRole.roleName,
      },
    );

    new cdk.CfnOutput(this, `The OPA Platform Pipeline name ARN Parameter`, {
      value: roleNameParam.parameterName,
    });

    const roleArnParam = new ssm.StringParameter(
      this,
      `${props.backstageEnv.prefix}PipelineRoleArn`,
      {
        allowedPattern: ".*",
        description: `The OPA Platform Pipeline Role ARN`,
        parameterName: `/apps/${props.backstageEnv.prefix}/iam/role/pipeline/arn`,
        stringValue: this.iamRole.roleArn,
      },
    );

    new cdk.CfnOutput(this, `The OPA Platform Pipeline Role ARN Parameter`, {
      value: roleArnParam.parameterName,
    });
  }
}
