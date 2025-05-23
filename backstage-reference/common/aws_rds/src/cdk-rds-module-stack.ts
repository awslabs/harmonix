import { CfnOutput, Stack, StackProps, Tags } from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as rg from "aws-cdk-lib/aws-resourcegroups";
import { Construct } from "constructs";

const StackVarNames = {
  appShortName: "DB_SHORT_NAME",
  vpcId: "TARGET_VPCID",
  envName: "TARGET_ENV_NAME",
  envProviderName: "TARGET_ENV_PROVIDER_NAME",
  dbName: "TARGET_DB_NAME"
};

export class CdkRdsModuleStack extends Stack {
  public readonly vpc: ec2.IVpc;
  public readonly rdsInstance: rds.DatabaseInstance;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const appShortName = "${{ values.component_id }}";
    const vpcId = process.env[StackVarNames.vpcId];
    // const envName = process.env[StackVarNames.envName];
    const dbName = process.env[StackVarNames.dbName];
    const envProviderName = process.env[StackVarNames.envProviderName];
    if (!appShortName) {
      throw new Error("Required environment variable: appShortName was not provided.");
    }
    if (!vpcId) {
      throw new Error("Required environment variable: vpcId, was not provided.");
    }
    if (!dbName) {
      throw new Error("Required environment variable: dbName, was not provided.");
    }

     // Tag all resources so that they can be grouped together in a Resource Group
    // the prefix "aws-apps:" is a convention adopted for this implementation
    const tagKey = `aws-resources:${appShortName}-${envProviderName}`;
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

    this.vpc = ec2.Vpc.fromLookup(this, "VPC", { vpcId: vpcId });

    // finally, lets configure and create our database!
    const rdsConfig: rds.DatabaseInstanceProps = {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_16_6 }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.M6I, ec2.InstanceSize.LARGE),

      vpc: this.vpc,

      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      maxAllocatedStorage: 200,

      databaseName: dbName,
      storageEncrypted: true,
    };

    // create the instance
    this.rdsInstance = new rds.DatabaseInstance(this, "rdsInstance", rdsConfig);

    // allow connections from within the VPC
    this.rdsInstance.connections.allowDefaultPortFrom(
      {
        connections: new ec2.Connections({
          peer: ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
        }),
      },
      `Allow connections from within VPC ${this.vpc.vpcId}`
    );

    // Output the endpoint and connection info so we can connect!
    new CfnOutput(this, "RdsArn", {
      description: "Arn for the RDS database instance",
      value: this.rdsInstance.instanceArn,
    });
    // The DB Admin secret is automatically generated by the rds.DatabaseInstance construct 
    // when it's not provided in the rds.DatabaseInstanceProps
    new CfnOutput(this, "DbAdminSecretArn", {
      description: "Arn for the SecretsManager secret containing RDS DB Admin credentials",
      value: this.rdsInstance.secret!.secretArn,
    });
    new CfnOutput(this, "DbEndpoint", {
      description: "Connection endpoint for the RDS database instance",
      value: this.rdsInstance.dbInstanceEndpointAddress,
    });
    new CfnOutput(this, "DbPort", {
      description: "Connection port for the RDS database instance",
      value: this.rdsInstance.dbInstanceEndpointPort,
    });

    new CfnOutput(this, "ResourceGroup", {
      description: `The tag-based resource group to identify resources related to ${appShortName}`,
      value: `${rscGroup.attrArn}`,
    });
    // print the stack name as a Cloudformation output
    new CfnOutput(this, `StackName`, {
      value: this.stackName,
      description: "The RDS DB CF Stack name",
    });
  }
}
