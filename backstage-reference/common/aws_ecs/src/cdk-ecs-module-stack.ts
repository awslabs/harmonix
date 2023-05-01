import { validate } from "@aws-sdk/util-arn-parser";
import { CfnOutput, RemovalPolicy, Stack, StackProps, Tags } from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as efs from "aws-cdk-lib/aws-efs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";
import { ApplicationLoadBalancedFargateService as ALBService } from "aws-cdk-lib/aws-ecs-patterns";
import * as kms from "aws-cdk-lib/aws-kms";
import * as logs from "aws-cdk-lib/aws-logs";
import * as rg from "aws-cdk-lib/aws-resourcegroups";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";

// Environment variables that can be passed in and used in this stack
// The env var names must match the values passed in from scaffolder action(s) building this stack
const StackVarNames = {
  appShortName: "APP_SHORT_NAME",
  vpcId: "TARGET_VPCID",
  clusterArn: "TARGET_ECS_CLUSTER_ARN",
  envName: "TARGET_ENV_NAME",
  envProviderName: "TARGET_ENV_PROVIDER_NAME",
};

export class EcsResourcesStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Validate that required env vars are provided
    const appShortName = process.env[StackVarNames.appShortName];
    const vpcId = process.env[StackVarNames.vpcId];
    const clusterArn = process.env[StackVarNames.clusterArn];
    const envName = process.env[StackVarNames.envName];
    const envProviderName = process.env[StackVarNames.envProviderName];
    if (appShortName === undefined || vpcId === undefined || clusterArn === undefined) {
      throw new Error("Required environment variables appShortName, vpcId, or clusterArn were not provided.");
    }

    // Tag all resources so that they can be grouped together in a Resource Group
    // the prefix "aws-apps:" is a convention adopted for this implementation
    const tagKey = `aws-apps:${appShortName}`;
    Tags.of(this).add(tagKey, appShortName);

    // Add any tags passed as part of AWS_RESOURCE_TAGS input parameters
    const resourceTagsEnvVar = process.env.AWS_RESOURCE_TAGS;
    if (resourceTagsEnvVar) {
      const resourceTags = (JSON.parse(resourceTagsEnvVar) as Record<string, string>[]);
      resourceTags.forEach(tag => {
        Tags.of(this).add(tag.Key, tag.Value);
      });
    }

    const rscGroup = new rg.CfnGroup(this, `${appShortName}-resource-group`, {
      name: `${appShortName}-rg`,
      description: `Resource related to ${appShortName}`,
      resourceQuery: {
        type: "TAG_FILTERS_1_0",
        query: {
          resourceTypeFilters: ["AWS::AllSupported"],
          tagFilters: [
            {
              key: tagKey,
            },
          ],
        },
      },
    });

    // Create a key for encrypting the repository
    const kmsKey = new kms.Key(this, "appKmsKey", {
      // alias: `${parameters.appShortName.valueAsString}-repo-key`,
      removalPolicy: RemovalPolicy.DESTROY,
      enableKeyRotation: true,
    });

    // TODO: ECR repositories cannot be automatically deleted when destroying the CDK stack.
    //       Emptying the repository of all images and then deleting the repo will need to be
    //       performed via SDK as part of any teardown/destroy actions
    // Create an ECR repository for the application container images
    const ecrRepository = new ecr.Repository(this, "ecr-repository", {
      repositoryName: process.env[StackVarNames.appShortName],
      imageScanOnPush: true,
      encryption: ecr.RepositoryEncryption.KMS,
      encryptionKey: kmsKey,
    });

    // Get references to the existing cluster and Vpc for the environment where the app will be deployed
    const clusterName = clusterArn.substring(clusterArn.lastIndexOf("/") + 1);
    const vpc = ec2.Vpc.fromLookup(this, "target-vpc", { vpcId });
    const cluster = ecs.Cluster.fromClusterAttributes(this, "ecs-cluster", {
      vpc,
      clusterName,
      securityGroups: [], // empty array required.  See https://github.com/aws/aws-cdk/issues/11146
    });

    // Get application plaintext env vars from the APP_ENV_PLAINTEXT env var
    const plaintextEnvVars = process.env.APP_ENV_PLAINTEXT;
    let environment: Record<string, string> | undefined;
    if (plaintextEnvVars) {
      environment = (JSON.parse(plaintextEnvVars) as Record<string, string>);
    }

    // prefer that the app's port is specified via the PORT env var.  Default to 8080
    const appPort = environment?.PORT || process.env["PORT"] || "8080";

    // Get application secrets from the APP_ENV_SECRETS env var
    let secrets: Record<string, ecs.Secret> | undefined;
    if (process.env.APP_ENV_SECRETS) {
      secrets = this.extractSecrets(process.env.APP_ENV_SECRETS);
    }

    // Log stream prefix so that the stream is easily identifiable
    const logGroupName = `/aws/apps/${envName}/${envProviderName}/${appShortName}`;

    // Create the task definition for the application container with reasonable defaults
    const taskDefinition = new ecs.TaskDefinition(this, `${appShortName}-taskDef`, {
      compatibility: ecs.Compatibility.FARGATE,
      cpu: "256",
      memoryMiB: "512",
    });

    // Create a container definition for the application container
    const containerDefinition = new ecs.ContainerDefinition(this, `${appShortName}-container`, {
      image: ecs.ContainerImage.fromEcrRepository(ecrRepository),
      taskDefinition,
      environment,
      secrets,
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: appShortName,
        logGroup: new logs.LogGroup(this, "taskImageLogGroup", { logGroupName, removalPolicy: RemovalPolicy.DESTROY }),
      }),
      portMappings: [{containerPort: +appPort}],
    });
    

    // Create an ECS service with an application load balancer in front
    const loadBalancedEcsService = new ALBService(this, `${appShortName}-ecspattern`, {
        cluster,
        serviceName: appShortName,
        taskDefinition,
        // enableExecuteCommand: true,  // Enable this for debugging and executing commands in the container
      }
    );
    // L3 construct above does not allow desiredCount to be 0, so drop down to L2 constructs to set value
    const cfnEcsService = loadBalancedEcsService.service.node.defaultChild as ecs.CfnService;
    cfnEcsService.desiredCount = 0;

    // ensure that the execution role can decrypt the key when pulling from the repo.
    kmsKey.grantDecrypt(loadBalancedEcsService.service.taskDefinition.executionRole!);

    // ADD EFS SUPPORT
    // If EFS information was provided as input, then add the EFS instance to the ESC task definition
    const efsId = process.env.EFS_ID;
    if (efsId ) {
      const volumeName = `${appShortName}-efs`;
      
      loadBalancedEcsService.taskDefinition.addVolume({
        name: volumeName,
        efsVolumeConfiguration: {
          transitEncryption: "ENABLED",
          fileSystemId: efsId,
          rootDirectory: "/",
          authorizationConfig: {
            accessPointId: process.env.EFS_ACCESS_POINT_ID,
          },  
        },  
      });  
      
      containerDefinition.addMountPoints({
        containerPath: process.env.EFS_MOUNT_PATH || "/data",
        sourceVolume: volumeName,
        readOnly: false,
      });  
      
      // TODO: get a reference to the EFS file system, then connections (securityGroups)
      // TODO: verify that this works as expected.
      const fstest = efs.FileSystem.fromFileSystemAttributes(this, 'fstest', {
        fileSystemId: efsId,
        securityGroup: loadBalancedEcsService.service.connections.securityGroups[0],
      });  
      fstest.connections.allowDefaultPortFrom(loadBalancedEcsService.service);
    }  
    

    // Output parameters
    new CfnOutput(this, "bawsEcrRepositoryUri", {
      description: `The ECR repository Uri for ${appShortName}`,
      value: ecrRepository.repositoryUri,
    });
    new CfnOutput(this, "bawsEcrRepositoryArn", {
      description: `The ECR repository Arn for ${appShortName}`,
      value: ecrRepository.repositoryArn,
    });
    new CfnOutput(this, "bawsEcsServiceArn", {
      description: `The ECS service for ${appShortName}`,
      value: loadBalancedEcsService.service.serviceArn,
    });
    new CfnOutput(this, "bawsEcsTaskDefinitionArn", {
      description: `The ECS task definition for ${appShortName}`,
      value: loadBalancedEcsService.taskDefinition.taskDefinitionArn,
    });
    new CfnOutput(this, "bawsAlbEndpoint", {
      description: `The endpoint for the ALB where the service can be reached for ${appShortName}`,
      value: `http://${loadBalancedEcsService.loadBalancer.loadBalancerDnsName}`,
    });
    new CfnOutput(this, "bawsTaskLogGroup", {
      description: `The LogGroup stream prefix for ${appShortName}`,
      value: `${logGroupName}`,
    });
    new CfnOutput(this, "bawsAppResourceGroup", {
      description: `The tag-based resource group to identify resources related to ${appShortName}`,
      value: `${rscGroup.attrArn}`,
    });
  }

  private extractSecrets(secretsJson: string): Record<string, ecs.Secret> {
    let secrets: Record<string, ecs.Secret> = {};
    const parsedSecrets = JSON.parse(secretsJson);
    for (const [k, v] of Object.entries(parsedSecrets)) {
      if (validate(v) && typeof v === "string") {
        if (v.includes(":secretsmanager:")) {
          const secret = secretsmanager.Secret.fromSecretCompleteArn(this, `secret-${k}`, v);
          secrets[k] = ecs.Secret.fromSecretsManager(secret);
        } else {
          // we assume that the value is an SSM Parameter Store secure string
          const ssmParam = ssm.StringParameter.fromSecureStringParameterAttributes(this, `ssmparam-${k}`, {
            parameterName: v,
          });
          secrets[k] = ecs.Secret.fromSsmParameter(ssmParam);
        }
      } else {
        console.log(
          `Skipping APP_ENV_SECRET "${k}".  The value must be a string, but received "${typeof v}" (${JSON.stringify(v)})`
        );
      }
    }
    return secrets;
  }
}
