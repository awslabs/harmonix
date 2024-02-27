
import { Construct } from "constructs";
import * as ecr from "aws-cdk-lib/aws-ecr"
import * as kms from "aws-cdk-lib/aws-kms";
import * as rg from "aws-cdk-lib/aws-resourcegroups";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as fs from 'fs';
import { Stack, StackProps, RemovalPolicy, Tags, CfnOutput } from "aws-cdk-lib/core";
import { EKSAppAdminRoleConstruct } from "./constructs/eks-env-app-admin-role-construct"
import {
  getAccountId,
  getClusterName,
  getAppAdminRoleArn,
  getEnvironmentName,
  getEnvironmentProviderName,
  getK8sIamRoleBindingType,
  getNamespace,
  getClusterOidcProvider,
  getPrefix,
  getRegion,
  getResourceTags,
  validateEKSStackRequiredEnvVars,
  OPAEnvironmentParams
} from "./eks-input";

interface PermissionList {
  [key: string]: string[]
}

// Read permissions files to augment a pod's IAM role
export function DeclareJSONStatements(readPermissionsPath: string): PermissionList {
  const list: PermissionList = {}
  if (fs.existsSync(readPermissionsPath)) {
    const fileNames = fs.readdirSync(readPermissionsPath).filter(file => file.match(/\.json$/))
    fileNames.forEach((fileName: string) => {
      let typeName = fileName.match(/(^.*?)\.json/)
      if (typeName) {
        list[typeName[1]] = JSON.parse(fs.readFileSync(readPermissionsPath + fileName, 'utf8').toString())
      }
    })
  }

  return list
}

export class EksResourcesStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const envName = getEnvironmentName();
    const prefix = getPrefix();
    const awsRegion = getRegion();
    const awsAccount = getAccountId();

    const opaEnvParams: OPAEnvironmentParams = {
      envName,
      awsRegion,
      awsAccount,
      prefix
    }

    const envIdentifier = `${opaEnvParams.prefix.toLowerCase()}-${opaEnvParams.envName}`;
    const envPathIdentifier = `/${opaEnvParams.prefix.toLowerCase()}/${opaEnvParams.envName.toLowerCase()}`;
    const appAdminRoleArn = getAppAdminRoleArn();
    const k8sIamRoleBindingType = getK8sIamRoleBindingType();
    const appShortName = "${{ values.component_id }}";
    const clusterName = getClusterName();
    const envProviderName = getEnvironmentProviderName();
    const namespace = getNamespace();
    const clusterOIDCProvider = getClusterOidcProvider();

    validateEKSStackRequiredEnvVars();

    let appAdminRoleArnParam = null;

    // Tag all resources so that they can be grouped together in a Resource Group
    // the prefix "aws-apps-" is a convention adopted for this implementation
    const tagKey = `aws-apps-${appShortName}-${envName}-${envProviderName}`;
    Tags.of(this).add(tagKey, appShortName);

    // Search for the particular env/provider permissions to apply
    const readPermissionsPath = `./permissions/${envName}/${envProviderName}/`

    // Add any tags passed as part of AWS_RESOURCE_TAGS input parameters
    const resourceTagsEnvVar = getResourceTags();
    if (resourceTagsEnvVar) {
      const resourceTags = (JSON.parse(resourceTagsEnvVar) as Record<string, string>[]);
      resourceTags.forEach(tag => {
        Tags.of(this).add(tag.Key, tag.Value);
      });
    }

    const rscGroup = new rg.CfnGroup(this, `${appShortName}-resource-group`, {
      name: `${appShortName}-${envName}-${envProviderName}-rg`,
      description: `Resources related to ${appShortName} in the ${envName} environment`,
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
      description: `Key used to encrypt ECR for ${appShortName}-${envName}-${envProviderName}`
    });

    // TODO: ECR repositories cannot be automatically deleted when destroying the CDK stack.
    //       Emptying the repository of all images and then deleting the repo will need to be
    //       performed via SDK as part of any teardown/destroy actions
    // Create an ECR repository for the application container images
    const ecrRepository = new ecr.Repository(this, "ecr-repository", {
      repositoryName: `${appShortName}-${envName}-${envProviderName}`.toLowerCase(),
      imageScanOnPush: true,
      encryption: ecr.RepositoryEncryption.KMS,
      encryptionKey: kmsKey,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteImages: true
    });

    // Create a new app admin IAM role if an existing IAM role was not provided by the user
    // This IAM role will be mapped to the k8s Role for namespace-bound access
    let appAdminRole;
    if (('existing_new_k8s_namespace_admin_iam_role' === k8sIamRoleBindingType) && appAdminRoleArn) {
      appAdminRole = iam.Role.fromRoleArn(this, 'role,', appAdminRoleArn);
    } else if ('create_new_k8s_namespace_admin_iam_role' === k8sIamRoleBindingType) {
      appAdminRole = new EKSAppAdminRoleConstruct(this,
        `${appShortName}-admin-role`,
        {
          opaEnv: opaEnvParams,
          eksClusterName: clusterName
        }
      ).iamRole;
    }

    if (appAdminRole) {
      // now save the app admin role ARN in SSM Param
      const appAdminRoleNameParam = new ssm.StringParameter(this, `${envIdentifier}-${appShortName}-admin-role-param`, {
        allowedPattern: ".*",
        description: `The IAM role name mapped to the K8s Role for namespace-bound k8s API access to ${appShortName} resources`,
        parameterName: `${envPathIdentifier}/${appShortName}-admin-role`,
        stringValue: appAdminRole.roleName,
      });

      appAdminRoleArnParam = new ssm.StringParameter(this, `${envIdentifier}-${appShortName}-admin-role-arn-param`, {
        allowedPattern: ".*",
        description: `The IAM role ARN mapped to the K8s Role for namespace-bound k8s API access to ${appShortName} resources`,
        parameterName: `${envPathIdentifier}/${appShortName}-admin-role-arn`,
        stringValue: appAdminRole.roleArn,
      });
    }

    const serviceAccountIamRole = new iam.Role(this, `${envIdentifier}-service-account-role`, {
      description: `IAM role for ${appShortName} serviceaccount "${namespace}/${appShortName}-sa-${envName}"`,
      assumedBy: new iam.FederatedPrincipal(
        `arn:aws:iam::${awsAccount}:oidc-provider/${clusterOIDCProvider}`,
        {
          'StringEquals': {
            [`${clusterOIDCProvider}:aud`]: 'sts.amazonaws.com',
            [`${clusterOIDCProvider}:sub`]: `system:serviceaccount:${namespace}:${appShortName}-sa-${envName}`,
          }
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
      // roleName: name, - let CDK generate the role name
    });

    // Add custom permissions to service account
    const fileStatements = DeclareJSONStatements(readPermissionsPath);
    Object.keys(fileStatements).forEach(key => {
      console.log(key)
      console.log(fileStatements[key])
      const statement: iam.PolicyStatement = iam.PolicyStatement.fromJson(fileStatements[key]);
      serviceAccountIamRole.addToPrincipalPolicy(statement);
    });

    // Output parameters
    new CfnOutput(this, "EcrRepositoryUri", {
      description: `The ECR repository Uri for ${appShortName}`,
      value: ecrRepository.repositoryUri,
    });
    new CfnOutput(this, "EcrRepositoryArn", {
      description: `The ECR repository Arn for ${appShortName}`,
      value: ecrRepository.repositoryArn,
    });

    new CfnOutput(this, "AppResourceGroup", {
      description: `The tag-based resource group to identify resources related to ${appShortName}`,
      value: `${rscGroup.attrArn}`,
    });

    new CfnOutput(this, `StackName`, {
      value: this.stackName,
      description: "The EKS App CF Stack name",
    });

    new CfnOutput(this, "AppAdminRoleArn", {
      value: appAdminRole ? appAdminRole.roleArn : '',
      description: `The IAM mapped to the K8s Role for namespace-bound k8s API access to ${appShortName} resources`,
    });

    new CfnOutput(this, "ServiceAccountRoleArn", {
      value: serviceAccountIamRole.roleArn,
      description: `The IAM role for serviceaccount "${namespace}/${appShortName}"`,
    });

  }
}

