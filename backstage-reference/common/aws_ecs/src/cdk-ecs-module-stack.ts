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
import * as fs from 'fs'
import { PolicyStatement } from "aws-cdk-lib/aws-iam";

interface PermissionList {
  [key: string]: string[] // adjusting require this in order to some json data type
}

export function DeclareJSONStatements(readPermissionsPath:string): PermissionList {
  const list: PermissionList = {} 
  if (fs.existsSync(readPermissionsPath)) {
    const fileNames = fs.readdirSync(readPermissionsPath).filter(file => file.match(/\.json$/))
    fileNames.forEach((fileName: string)=> {
      let typeName = fileName.match(/(^.*?)\.json/)
      if(typeName){
        list[typeName[1]] = JSON.parse(fs.readFileSync(readPermissionsPath + fileName, 'utf8').toString())
      }
    })
  }
  
  return list
}

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
    const appShortName = "${{ values.component_id }}";
    const vpcId = process.env[StackVarNames.vpcId];
    const clusterArn = process.env[StackVarNames.clusterArn];
    const envName = process.env[StackVarNames.envName];
    const envProviderName = process.env[StackVarNames.envProviderName];
    if (!appShortName) {
      throw new Error("Required environment variable: appShortName was not provided.");
    }
    if (!vpcId) {
      throw new Error("Required environment variable: vpcId, was not provided.");
    }
    if (!clusterArn) {
      throw new Error("Required environment variable: clusterArn was not provided.");
    }
    if (!envName) {
      throw new Error("Required environment variable: envName was not provided.");
    }
    if (!envProviderName) {
      throw new Error("Required environment variable: envProviderName was not provided.");
    }

    // Tag all resources so that they can be grouped together in a Resource Group
    // the prefix "aws-apps:" is a convention adopted for this implementation
    const tagKey = `aws-apps:${appShortName}-${envProviderName}`;
    Tags.of(this).add(tagKey, appShortName);

    // Search for the particular env/provider permissions to apply
    const readPermissionsPath = `./permissions/${envName}/${envProviderName}/`

    // Add any tags passed as part of AWS_RESOURCE_TAGS input parameters
    const resourceTagsEnvVar = process.env.AWS_RESOURCE_TAGS;
    if (resourceTagsEnvVar) {
      const resourceTags = (JSON.parse(resourceTagsEnvVar) as Record<string, string>[]);
      resourceTags.forEach(tag => {
        Tags.of(this).add(tag.Key, tag.Value);
      });
    }

    const rscGroup = new rg.CfnGroup(this, `${appShortName}-resource-group`, {
      name: `${appShortName}-${envProviderName}-rg`,
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

    // Create a key for encrypting the ECR repository
    const kmsKey = new kms.Key(this, "appKmsKey", {
      // alias: `${parameters.appShortName.valueAsString}-repo-key`,
      removalPolicy: RemovalPolicy.DESTROY,
      enableKeyRotation: true,
      description: "Key used to encrypt ECS app repository"
    });

    // Create an ECR repository for the application container images
    const ecrRepository = new ecr.Repository(this, "ecr-repository", {
      repositoryName: `${appShortName}-${envName}-${envProviderName}`.toLowerCase(),
      imageScanOnPush: true,
      encryption: ecr.RepositoryEncryption.KMS,
      encryptionKey: kmsKey,
      removalPolicy: RemovalPolicy.DESTROY,
      emptyOnDelete: true
    });

    // Get references to the existing cluster and Vpc for the environment where the app will be deployed
    const clusterName = clusterArn.substring(clusterArn.lastIndexOf("/") + 1);
    const vpc = ec2.Vpc.fromLookup(this, "target-vpc", { vpcId });
    const cluster = ecs.Cluster.fromClusterAttributes(this, "ecs-cluster", {
      vpc,
      clusterName,
      securityGroups: [], // empty array required.  See https://github.com/aws/aws-cdk/issues/11146
    });

    // Get application plaintext env vars from the appEnvPlaintext env var
    let plaintextEnvVars: Record<string, string | number | boolean | Array<any>> = {};
    let environment: Record<string, string> = {};
    {%- if values.appEnvPlaintext %}
    plaintextEnvVars = ${{values.appEnvPlaintext | dump}}
    {%- endif %}
    // convert all values to strings.  ECS container definition env vars require Record<string, string>
    Object.keys(plaintextEnvVars).forEach(key => {
      environment[key] = '' + plaintextEnvVars[key];
    });

    // prefer that the app's port is specified via the PORT env var.  Default to 8080
    const appPort = environment?.PORT || "8080";


    // Get application secrets from the APP_ENV_SECRETS env var
    let secrets: Record<string, ecs.Secret> | undefined;
    const envSecrets = process.env.APP_ENV_SECRETS; // ${{ values.app_env_secrets }};
    if (envSecrets) {
      secrets = this.extractSecrets(envSecrets);
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
        serviceName: `${appShortName}-${envProviderName}`,
        taskDefinition,
        // enableExecuteCommand: true,  // Enable this for debugging and executing commands in the container
      }
    );
    // L3 construct above does not allow desiredCount to be 0, so drop down to L2 constructs to set value
    const cfnEcsService = loadBalancedEcsService.service.node.defaultChild as ecs.CfnService;
    cfnEcsService.desiredCount = 0;

    // Add the health check
    loadBalancedEcsService.targetGroup.configureHealthCheck({
      path: "${{values.app_health_endpoint or '/'}}",
    });
    
    // ensure that the execution role can decrypt the key when pulling from the repo.
    kmsKey.grantDecrypt(loadBalancedEcsService.service.taskDefinition.executionRole!);
    kmsKey.grantDecrypt(loadBalancedEcsService.service.taskDefinition.taskRole!);
    // ADD EFS SUPPORT
    // If EFS information was provided as input, then add the EFS instance to the ESC task definition
    const efsId = process.env.EFS_ID; // ${{ values.efs_id }};
    if (efsId ) {
      const volumeName = `${appShortName}-${envProviderName}-efs`;
      
      loadBalancedEcsService.taskDefinition.addVolume({
        name: volumeName,
        efsVolumeConfiguration: {
          transitEncryption: "ENABLED",
          fileSystemId: efsId,
          rootDirectory: "/",
          authorizationConfig: {
            accessPointId: process.env.EFS_ACCESS_POINT_ID, // ${{ values.efs_access_point_id }},
          },  
        },  
      });  
      
      containerDefinition.addMountPoints({
        containerPath: process.env.EFS_MOUNT_PATH || "/data", // ${{ values.efs_mount_path }} || "/data",
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
    
    // Add custom permissions
    const fileStatements = DeclareJSONStatements(readPermissionsPath);
    Object.keys(fileStatements).forEach(key=> {
      if (loadBalancedEcsService.service.taskDefinition.executionRole)
      {
        console.log(key)
        console.log(fileStatements[key])
        const statement:PolicyStatement = PolicyStatement.fromJson(fileStatements[key]);
        loadBalancedEcsService.service.taskDefinition.executionRole.addToPrincipalPolicy(statement);
        loadBalancedEcsService.service.taskDefinition.taskRole.addToPrincipalPolicy(statement);
      }
    })

    // Output parameters
    new CfnOutput(this, "EcrRepositoryUri", {
      description: `The ECR repository Uri for ${appShortName}`,
      value: ecrRepository.repositoryUri,
    });
    new CfnOutput(this, "EcrRepositoryArn", {
      description: `The ECR repository Arn for ${appShortName}`,
      value: ecrRepository.repositoryArn,
    });
    new CfnOutput(this, "EcsServiceArn", {
      description: `The ECS service for ${appShortName}`,
      value: loadBalancedEcsService.service.serviceArn,
    });
    new CfnOutput(this, "EcsTaskDefinitionArn", {
      description: `The ECS task definition for ${appShortName}`,
      value: loadBalancedEcsService.taskDefinition.taskDefinitionArn,
    });
    new CfnOutput(this, "AlbEndpoint", {
      description: `The endpoint for the ALB where the service can be reached for ${appShortName}`,
      value: `http://${loadBalancedEcsService.loadBalancer.loadBalancerDnsName}`,
    });
    new CfnOutput(this, "TaskLogGroup", {
      description: `The LogGroup stream prefix for ${appShortName}`,
      value: `${logGroupName}`,
    });
    new CfnOutput(this, "AppResourceGroup", {
      description: `The tag-based resource group to identify resources related to ${appShortName}`,
      value: `${rscGroup.attrArn}`,
    });

    new CfnOutput(this, "TaskExecutionRoleArn", {
      description: `The task execution role identify resources related to ${appShortName}`,
      value: `${loadBalancedEcsService.service.taskDefinition.executionRole}`,
    });

    // print the stack name as a Cloudformation output
    new CfnOutput(this, `StackName`, {
      value: this.stackName,
      description: "The ECS App CF Stack name",
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
