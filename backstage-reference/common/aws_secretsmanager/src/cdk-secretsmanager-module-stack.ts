import * as cdk from "aws-cdk-lib";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Tags } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as fs from 'fs';
import * as iam from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";
import * as rg from "aws-cdk-lib/aws-resourcegroups";

interface AppBindingList {
  [key: string]: string
}

export function GetResourceBindingInfo(appBindingPath:string): any[] {
  const list:any[] = [];
  if (fs.existsSync(appBindingPath)) {
    const fileNames = fs.readdirSync(appBindingPath).filter(file => file.match(/\.json$/))
    fileNames.forEach((fileName: string)=> {
      let typeName = fileName.match(/(^.*?)\.json/)
      if(typeName){
        list.push(JSON.parse(fs.readFileSync(appBindingPath + fileName, 'utf8')))
      }
    })
  }
  
  return list
}

// ------------------ HOSTED ROTATION ------------------ //
const hostedRotationMapping: {[sourceString: string]: Function} = {
  "mariaDbMultiUser": secretsmanager.HostedRotation.mariaDbMultiUser,
  "mariaDbSingleUser": secretsmanager.HostedRotation.mariaDbSingleUser,
  "mongoDbMultiUser": secretsmanager.HostedRotation.mongoDbMultiUser,
  "mongoDbSingleUser": secretsmanager.HostedRotation.mongoDbSingleUser,
  "mysqlMultiUser": secretsmanager.HostedRotation.mysqlMultiUser,
  "mysqlSingleUser": secretsmanager.HostedRotation.mysqlSingleUser,
  "oracleMultiUser": secretsmanager.HostedRotation.oracleMultiUser,
  "oracleSingleUser": secretsmanager.HostedRotation.oracleSingleUser,
  "postgreSqlMultiUser": secretsmanager.HostedRotation.postgreSqlMultiUser,
  "postgreSqlSingleUser": secretsmanager.HostedRotation.postgreSqlSingleUser,
  "redshiftMultiUser": secretsmanager.HostedRotation.redshiftMultiUser,
  "redshiftSingleUser": secretsmanager.HostedRotation.redshiftSingleUser,
  "sqlServerMultiUser": secretsmanager.HostedRotation.sqlServerMultiUser,
  "sqlServerSingleUser": secretsmanager.HostedRotation.sqlServerSingleUser
}

export interface CdkSecretsManagerStackProps extends cdk.StackProps {
  secretId: string;
  secretDescription: string;
  kmsCmk: string;
  //--------------- HOSTED ROTATION AND CROSS ACCOUNT ROLE ACCESS --------------- //
  hostedRotation: string;
  crossAccountRoles: string;
}

export class CdkSecretsManagerStack extends cdk.Stack {
  public readonly secretInstance: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: CdkSecretsManagerStackProps) {
    super(scope, id, props);

    // Set up the configuration for the new secret
    const secretConfig: secretsmanager.SecretProps = props.kmsCmk === "True" ? {
      description: props.secretDescription,
      secretName: `${props.secretId}`,
      encryptionKey: new kms.Key(this, `${props.secretId}-kms-key`, {
        description: `Custom KMS Key for ${props.secretId}`,
        enableKeyRotation: true,
      })
    }: {description: props.secretDescription, secretName: `${props.secretId}`}

    const tagKey = `aws-resources:${props.secretId}`;
    Tags.of(this).add(tagKey, props.secretId);

    const rscGroup = new rg.CfnGroup(this, `${props.secretId}-resource-group`, {
      name: `${props.secretId}-rg`,
      description: `Resource related to ${props.secretId}`,
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


    const appBindingPath = `./binding/`
    const fileStatements = GetResourceBindingInfo(appBindingPath);
    
    let secretArn: string;
    let secretName: string;
    
    const secretInstance = new secretsmanager.Secret(this, props.secretId || "secret", secretConfig);
    secretArn = secretInstance.secretArn;
    secretName = secretInstance.secretName;
    

    //------------------------ HOSTED ROTATION ------------------------//
    // check if hostedRotation != None
    if (props.hostedRotation !== "None") {
      // if it doesn't add hosted rotation for the specified user type
      secretInstance.addRotationSchedule('RotationSchedule', {
        hostedRotation: hostedRotationMapping[props.hostedRotation]()
      })
    }

    //------------------------ CROSS ACCOUNT ROLE ACCESS ------------------------//
    // check if cross account roles provided
    if (props.crossAccountRoles.length > 0) {
      // add resource policy that gives access to role(s)
      const policy = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: props.crossAccountRoles.split(",").filter(item => item).map(item => new iam.ArnPrincipal(item)),
        actions: [
          'secretsmanager:GetSecretValue',
          'secretsmanager:DescribeSecret',  
        ],
        resources: ['*'],
      })

      secretInstance.addToResourcePolicy(policy)
    }

    //------------------------ RESOURCE BINDING ------------------------// 
    fileStatements.forEach(file=> {
      Tags.of(secretInstance).add(`BoundApp-${file['AppName']}`, file['AppName']);
      console.log(Tags.of(secretInstance))
      // add SM resource policy

      const secretResourcePolicy = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.AnyPrincipal()],
        actions: [
          'secretsmanager:GetSecretValue',
          'secretsmanager:PutSecretValue',
          'secretsmanager:UpdateSecretVersionStage',
        ],
        resources: ['*'],
      })
      
      const condition = `secretsmanager:ResourceTag/BoundApp-${file["AppName"]}`
      secretResourcePolicy.addCondition('StringEquals', {
        [`${condition}`]: "${aws:PrincipalTag/appName}",
      })
      secretInstance.addToResourcePolicy(secretResourcePolicy);
      
    })
    


    // Output the full secret arn for downstream consumers
    new cdk.CfnOutput(this, "SecretArn", {
      description: "Arn for the newly created secret",
      value: secretArn!,
    });

    new cdk.CfnOutput(this, "ResourceGroup", {
      description: `The tag-based resource group to identify resources related to ${props.secretId}`,
      value: `${rscGroup.attrArn}`,
    });

    // Output the full secret name for downstream consumers
    new cdk.CfnOutput(this, "SecretName", {
      description: "Name for the newly created secret",
      value: secretName!,
    });

    new cdk.CfnOutput(this, "StackName", {
      description: "Name of CloudFormation Stack",
      value: this.stackName,
    });
  }
}
