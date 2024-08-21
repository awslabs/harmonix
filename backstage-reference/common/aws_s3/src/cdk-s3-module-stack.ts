import { CfnOutput, RemovalPolicy, Stack, StackProps, Tags } from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as rg from "aws-cdk-lib/aws-resourcegroups";
import { Construct } from "constructs";

const StackVarNames = {
  appShortName: "APP_SHORT_NAME",
  envName: "TARGET_ENV_NAME",
  envProviderName: "TARGET_ENV_PROVIDER_NAME",
  BucketName: "TARGET_BUCKET_NAME"
};

export class CdkS3ModuleStack extends Stack {

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const appShortName = process.env[StackVarNames.appShortName];
    const bucketName = process.env[StackVarNames.BucketName];
    const envProviderName = process.env[StackVarNames.envProviderName];
    if (!appShortName) {
      throw new Error("Required environment variable: APP_SHORT_NAME was not provided.");
    }
    if (!bucketName) {
      throw new Error("Required environment variable: BucketName, was not provided.");
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
      name: `${bucketName}-rg`,
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

    // finally, lets create our bucket! - Change to your desire bucket settings
    const bucket = new s3.Bucket(this, 'Bucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      bucketName: bucketName,
      versioned: true,
      removalPolicy: RemovalPolicy.DESTROY,   // CHANGE IN PROD
    });

    // Output the endpoint and connection info so we can connect!
    new CfnOutput(this, "BucketName", {
      description: "Name of the S3 Bucket",
      value: bucket.bucketName,
    });

    new CfnOutput(this, "BucketArn", {
      description: "Arn of the S3 Bucket",
      value: bucket.bucketArn,
    });

    new CfnOutput(this, "ResourceGroup", {
      description: `The tag-based resource group to identify resources related to ${appShortName}`,
      value: `${rscGroup.attrArn}`,
    });
    // print the stack name as a Cloudformation output
    new CfnOutput(this, `StackName`, {
      value: this.stackName,
      description: "The S3 Bucket CF Stack name",
    });
  }
}
