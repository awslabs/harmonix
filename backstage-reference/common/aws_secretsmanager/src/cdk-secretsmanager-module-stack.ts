import * as cdk from "aws-cdk-lib";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

export interface CdkSecretsManagerStackProps extends cdk.StackProps {
  secretId: string;
  secretDescription: string;
}

export class CdkSecretsManagerStack extends cdk.Stack {
  public readonly secretInstance: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: CdkSecretsManagerStackProps) {
    super(scope, id, props);

    // Set up the configuration for the new secret
    const secretConfig: secretsmanager.SecretProps = {
      description: props.secretDescription,
      secretName: `${props.secretId}`,
    };

    // Create a new secret to store the API keys, access tokens, credentials, etc
    this.secretInstance = new secretsmanager.Secret(this, props.secretId || "secret", secretConfig);

    // Output the full secret arn for downstream consumers
    new cdk.CfnOutput(this, "opaSecretArn", {
      description: "Arn for the newly created secret",
      value: this.secretInstance.secretArn,
    });
  }
}
