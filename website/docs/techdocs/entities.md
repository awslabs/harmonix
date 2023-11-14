---
sidebar_position: 2
---

# Entities

OPA on AWS uses some Backstage out of the box entities but also introduces two new entities in the software catalog.

## AWS Environment & Environment Provider
These custom Backstage entity kinds were created to represent an abstract AWS environment and environment provider. 

### AWS Environment
An abstracted entity that captures the intent of use of a particular environment instance, including:

1. Single/multi account.
2. Single/multi region.
3. Category – dev, test, stage, prod etc.
4. Classification – private, internal, public.
5. Requires approval - for automated pipeline deployments.
6. System - for participation in higher level systems.
7. Hierarchy – where does it position in the hierarchy of other environments (low – dev, high – prod).

:::info
AWS Environment Entity Definition: [AWSEnvironmentEntityV1.ts](https://github.com/awslabs/app-development-for-backstage-io-on-aws/blob/main/backstage-plugins/plugins/aws-apps-backend/src/model/kind/AWSEnvironmentEntityV1.ts)
:::

AWS Environment Principles:
1. Maintain 1:N relationship with AWS environment providers.
2. Integrated with pipeline definitions for deployments that require approval.
3. Customizable and extendable.
4. Can be used with different types of Environment Providers.


```jsx title="AWSEnvironmentEntityV1.ts"
 export interface AWSEnvironmentEntityV1 extends Entity {
    apiVersion: 'aws.backstage.io/v1alpha';
    kind: 'AWSEnvironment';
    spec: {
    ...
    }
 }
```




AWS Environment enforces the creation of a relationship with environment providers through the entity Processor

```jsx title="AWSEnvironmentEntitiesProcessor.ts"
  if (targetRef.kind == 'awsenvironmentprovider') {
              emit(
                processingResult.relation({
                  source: selfRef,
                  type: RELATION_DEPENDS_ON,
                  target: {
                    kind: targetRef.kind,
                    namespace: targetRef.namespace,
                    name: targetRef.name,
                  },
                }),
              );
              emit(
                processingResult.relation({
                  source: {
                    kind: targetRef.kind,
                    namespace: targetRef.namespace,
                    name: targetRef.name,
                  },
                  type: RELATION_DEPENDENCY_OF,
                  target: selfRef,
                }),
              );
            }
```

:::info
AWS Environment Processor code: [AWSEnvironmentEntitiesProcessor.ts](https://github.com/awslabs/app-development-for-backstage-io-on-aws/blob/main/backstage-plugins/plugins/aws-apps-backend/src/model/processor/AWSEnvironmentEntitiesProcessor.ts)
:::

### AWS Environment Provider
A custom kind entity that captures a place in the cloud that can be used to provision and run applications.
An Environment provider can be defined by:
1. A particular AWS Account
2. A particular AWS Region
3. A name and prefix composition for organization segmentation (payments:development, hr:production etc.)
4. Mutually exclusive – multiple distinct providers can be created within a single AWS account and region
5. Isolated from other providers / accounts
6. Provisioning role - a role that has sufficient permissions to provision the resources for the designated types of applications.
7. Operations role - a role that has sufficient permissions to operate the designated types of applications.
8. Audit table - a dedicated table to capture the actions performed on the applications running in the current environment.
9. Optional: The underlying networking (VPC), runtime environment (ECS/EKS/Serverless), and required applications infrastructure 

<p align="center">
![aws-environment-provider.png](/img/docs/aws-environment-provider.png)
</p>


:::info
AWS Environment Provider Entity Definition: [AWSEnvironmentProviderEntityV1.ts](https://github.com/awslabs/app-development-for-backstage-io-on-aws/blob/main/backstage-plugins/plugins/aws-apps-backend/src/model/kind/AWSEnvironmentProviderEntityV1.ts)
:::

```jsx title="AWSEnvironmentEntityV1.ts"
 export interface AWSEnvironmentProviderEntityV1 extends Entity {
    apiVersion: 'aws.backstage.io/v1alpha';
    kind: 'AWSEnvironmentProvider';
    spec: {
    ...
    }
 }
```

:::info
AWS Environment Provider Processor code: [AWSEnvironmentProviderEntitiesProcessor.ts](https://github.com/awslabs/app-development-for-backstage-io-on-aws/blob/main/backstage-plugins/plugins/aws-apps-backend/src/model/processor/AWSEnvironmentProviderEntitiesProcessor.ts)
:::

## Components

We map applications to the existing Backstage entity component. While the concept of an application can be interpreted in different ways, we found the [kind component](https://backstage.io/docs/features/software-catalog/descriptor-format/#kind-component) to be very close to it.

### The structure of application component entity:
When provisioning an application, the template creates a Backstage catalog info yaml file with the below properties:
```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: "Your App name"
  description: "Description"
  tags:
    - aws
    - nodejs
  iac-type: cdk
  repo-secret-arn: "arn:aws:secretsmanager:us-east-1:**********.:secret:***"
  spec:
    type: aws-app
    owner: "group:default/developers"
    lifecycle: experimental
    dependsOn: [FirstDeployedEnvironment]
```
We introduce a new component **spec type** - *aws-app* which will be used to mark applications that run on AWS. This is used to provide a specific UI experience that allows users to operate the application in the AWS cloud.


The **iac-type** property indicates the type of the infrastructure as code this app was provisioned with - this impacts both the pipeline as well as the UI experience that are based on Terraform or CDK (state management).

:::tip
 You may notice that repo-secret-arn is created regardless of the environment where the application is deployed - that is because the access to the repository is part of the platform / solution account regardless of where is it being deployed.
:::

After the application provisioning pipeline completes, the pipeline will update the entity with the environment deployed resources under the *appData* tag:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: "AML-Detection-EMEA"
  description: "AML Detection App for EMEA"
  tags:
    - aws
    - nodejs
  annotations:
    aws.amazon.com/opa-repo-secret-arn: "arn:aws:secretsmanager:us-east-1:**********.:secret:aws-apps-aml-detection-emea-access-token-V9w8Ea"
  iac-type: cdk
  repo-secret-arn: "arn:aws:secretsmanager:us-east-1:**********.:secret:aws-apps-aml-detection-emea-access-token-V9w8Ea"
  appData:
    EMEA-AML-dev:
      emea-aml-dev:
        EcrRepositoryUri: **********.dkr.ecr.eu-west-1.amazonaws.com/aml-detection-emea-emea-aml-dev
        EcrRepositoryArn: arn:aws:ecr:eu-west-1:**********.:repository/aml-detection-emea-emea-aml-dev
        EcsServiceArn: arn:aws:ecs:eu-west-1:**********.:service/aml-emea-aml-dev-cluster/AML-Detection-EMEA-emea-aml-dev
        EcsTaskDefinitionArn: arn:aws:ecs:eu-west-1:**********.:task-definition/******:1
        AlbEndpoint: http://AML-D-AMLDe-11C7BFBPF0RHP-**********..eu-west-1.elb.amazonaws.com
        TaskLogGroup: /aws/apps/EMEA-AML-dev/emea-aml-dev/AML-Detection-EMEA
        TaskExecutionRoleArn: AML-Detection-EMEA-ecs-resources-emea-aml-dev/AML-Detection-EMEA-taskDef/ExecutionRole
        AppResourceGroup: arn:aws:resource-groups:eu-west-1:**********.:group/AML-Detection-EMEA-emea-aml-dev-rg
        StackName: AML-Detection-EMEA-ecs-resources-emea-aml-dev
    EMEA-AML-test:
      emea-aml-test:
        EcrRepositoryUri: **********..dkr.ecr.eu-west-1.amazonaws.com/aml-detection-emea-emea-aml-test
        EcrRepositoryArn: arn:aws:ecr:eu-west-1:**********.:repository/aml-detection-emea-emea-aml-test
        EcsServiceArn: arn:aws:ecs:eu-west-1:**********.:service/aml-emea-aml-test-cluster/AML-Detection-EMEA-emea-aml-test
        EcsTaskDefinitionArn: arn:aws:ecs:eu-west-1:**********.:task-definition/*****:1
        AlbEndpoint: http://AML-D-AMLDe-HNBIDJ2F0QER-**********.eu-west-1.elb.amazonaws.com
        TaskLogGroup: /aws/apps/EMEA-AML-test/emea-aml-test/AML-Detection-EMEA
        TaskExecutionRoleArn: AML-Detection-EMEA-ecs-resources-emea-aml-test/AML-Detection-EMEA-taskDef/ExecutionRole
        AppResourceGroup: arn:aws:resource-groups:eu-west-1:**********.:group/AML-Detection-EMEA-emea-aml-test-rg
        StackName: AML-Detection-EMEA-ecs-resources-emea-aml-test
spec:
  type: aws-app
  owner: "group:default/developers"
  lifecycle: experimental
  dependsOn: ['awsenvironment:default/EMEA-AML-dev', 'awsenvironment:default/EMEA-AML-test']

```

:::tip
 You may notice that the example above describes an entity of an application that is deployed in two environments: *EMEA-AML-dev* and *EMEA-AML-test*
:::

Similiarly a serverless application entity will look like :

```yaml 
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: "snacks"
  kebabName: "snacks"
  description: "get a list of yummy snack foods"
  tags:
    - aws
    - rest
    - swagger
    - openapi
    - apigateway
    - serverless
  annotations:
    aws.amazon.com/opa-repo-secret-arn: "arn:aws:secretsmanager:us-east-1:**********:secret:aws-apps-snacks-access-token-0IMiXR"
    aws.amazon.com/opa-component-subtype: "serverless-rest-api"
  iac-type: cdk
  repo-secret-arn: "arn:aws:secretsmanager:us-east-1:**********:secret:aws-apps-snacks-access-token-0IMiXR"
  appData:
    api-team-dev:
      api-team-dev:
        AppResourceGroup: arn:aws:resource-groups:us-east-1:**********::group/snacks-api-team-dev-rg
        StackName: snacks-serverless-api-resources-api-team-dev
        AppStackName: snacks-api-team-dev
        BuildBucketName: snacks-serverless-api-re-snacksapiteamdevbuildbuc-**********
    api-team-qa:
      api-team-qa:
        AppResourceGroup: arn:aws:resource-groups:us-east-1:**********:group/snacks-api-team-qa-rg
        StackName: snacks-serverless-api-resources-api-team-qa
        AppStackName: snacks-api-team-qa
        BuildBucketName: snacks-serverless-api-re-snacksapiteamqabuildbuck-**********
spec:
  type: aws-app
  owner: "group:default/developers"
  lifecycle: experimental
  dependsOn: ['awsenvironment:default/api-team-dev', 'awsenvironment:default/api-team-qa']
```


## Resource

Backstage resource entities are used to illustrate AWS resources. However, we extended the model so that we can articulate specific UI and processes that won't conflict with Backstage built-in capabilities of *Resource* entities.

Resource entity catalog:

```yaml 
apiVersion: backstage.io/v1alpha1
kind: Resource
metadata:
  name: "Commercial-Pymt-db-us"
  description: "Payment DB for commercial apps in US"
  tags:
    - aws
    - rds
    - aws-resource
    - database
  annotations: null
  iac-type: cdk
  resource-type: "aws-rds"
  db-name: "pymtdb"
  db-object-name: "user"
  appData:
    US-Commercial:
      us-commercial-dev:
        Arn: arn:aws:rds:us-east-1:**********:db:commercial-pymt-db-us-rds-reso-rdsinstance05f4b4b0-**********
        DbAdminSecretArn: arn:aws:secretsmanager:us-east-1:**********:secret:rdsInstanceSecretB79B16A5-**********-Y8ykm1
        DbEndpoint: commercial-pymt-db-us-rds-reso-rdsinstance05f4b4b0-xwcil8gg8rvp.**********.us-east-1.rds.amazonaws.com
        DbPort: '5432'
        ResourceGroup: arn:aws:resource-groups:us-east-1:**********:group/Commercial-Pymt-db-us-us-commercial-dev-rg
        StackName: Commercial-Pymt-db-us-rds-resource
spec:
  type: aws-resource
  owner: "group:default/dev-ops"
  lifecycle: experimental
  dependsOn: ['awsenvironment:default/US-Commercial']
```
Core resource entity properties:
1. **spec/type** -> *aws-resource* . while we use the same kind of *Resource* the spec type refers to aws-resource which can be easily used to filter our AWS related resources.
2. **resource-type** this is used to capture the different types of AWS resources including: aws-rds, s3, sns, sqs etc.

Extended resource entity properties:
1.  **db-name** - in this aws-rds resource the property captures the database name
2.  **db-object-name** in this aws-rds resource the property captures the schema/user name
3.  **appData** - under this property, all deployed resource artifacts are preserved - you can customize what properties you would like to bring back to the entity from the provisioning pipeline.

:::note
AWS Resources are provisioned against a single environment. The process of deploying a resource to an additional environment is not supported to avoid managing different configurations or changes of the resource that are not identical across multiple environments.

:::
