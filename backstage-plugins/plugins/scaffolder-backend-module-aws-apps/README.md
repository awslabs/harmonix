<!-- 
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 
-->

# AWS Apps Scaffolder Actions

`@aws/plugin-scaffolder-backend-aws-apps-for-backstage`

This plugin provides scaffolder actions to create AWS resources and utility actions for interacting with Gitlab repositories.

## Install

```sh
# From your Backstage root directory
yarn add --cwd packages/backend @aws/plugin-scaffolder-backend-aws-apps-for-backstage@0.1.0
```

## Configuration

Configure the action(s) you would like to use in your Backstage app.

```ts
// packages/backend/src/plugins/scaffolder.ts

import { 
  createBawsDeployBoilerplateAction, 
  createRepoAccessTokenAction, 
  createSecretAction,
} from '@aws/plugin-scaffolder-backend-aws-apps-for-backstage';

...

const actions = [
  ...builtInActions,
  createBawsDeployBoilerplateAction({ catalogClient }),
  createRepoAccessTokenAction({ integrations }),
  createSecretAction(),
];
...
```
After the scaffolder configuration is updated, you can use the new actions in your Software Templates.

## AWS Apps Scaffolder Actions

Documentation for common usage of the contributed scaffolder actions is included below.
For full documentation of the scaffolder action inputs and outputs, see the https://<your backstage app>/create/actions page in your Backstage app.

The scaffolder actions which create AWS resources will leverage the AWS Environments and Environments Provider model provided in the `@aws/plugin-aws-apps-backend-for-backstage` plugin.
Reference the plugin documentation to understand how to create and surface AWS Environments for use in scaffolder actions and the UI.

### Deploy boilerplate

The `baws:deploy-boilerplate` scaffolder action invoke a provisioning pipeline in AWS to execute the code contained in a "boilerplate" repository.  "Boilerplate" repository references the name of a git repository containing Infrastructure as Code (CDK, Terraform, or CloudFormation) and a [`buildspec.yaml` build specification file][buildspec_ref] which drives an AWS CodeBuild build.

This action is often one of the first actions included in a Software Template since it is responsible for provisioning AWS resources required to run an application.  For example, the action's referenced boilerplate may be responsible for provisioning an ECS task definition, container definition, ECS service, Application Load Balancer, Security Groups, and other resources to run an application in a Fargate ECS cluster.

Values specified through the `inputParameters` input will be passed to the CodeBuild project as environment variables.  The boilerplate repository's code will be responsible for defining any expected environment variables.  All environment variables values will be passed as strings, so the boilerplate repository will also be responsible for deserializing any values to convert them into numbers, objects, booleans, or arrays.

The template snippet below demonstrates this action in the `steps` section of a Backstage Software Template.  See the example in the plugin's [src/example/template.yaml][example_template] file to better understand the action in the context of a full template.

```yaml
# template.yaml

...
  steps:
    ...
    # Deploy the ESC resources to run the application.  
    # Here, we invoke the `baws:deploy-boilerplate` action and specify 
    # the 'ecs_resources' repository as the location of the boilerplate IaC code.  
    - id: deployECSResources
      name: Deploy AWS ECS Resources
      action: baws:deploy-boilerplate
      input:
        boilerplateRepositories:
          # Invoke the boilerplate which creates resources to run an application as an ECS container
          - ecs_resources
        inputParameters:
          # The ecs_resources boilerplate uses APP_SHORT_NAME as part of naming AWS resources
          APP_SHORT_NAME: ${{ parameters.component_id}}
          # APP_ENV_PLAINTEXT values are passed as plaintext env vars to the container
          # by the ecs_resources boilerplate
          APP_ENV_PLAINTEXT:
            PORT: "3001"
          # Example for adding tags to resources created via the boilerplate
          AWS_RESOURCE_TAGS:
            - Key: CostCenter
              Value: HR-1234
        # Specify the Backstage entity ref string for the AWS Environment 
        # where the app should be deployed
        environmentRef: ${{ parameters.environment }}
        # Specify the type of action being performed by the boilerplate (for audit purposes)
        actionType: "Create App"
    ...

```

### Create AWS SecretsManager Secrets

The `baws:create-secret` scaffolder action creates a new Secret in the [AWS Secrets Manager service](https://aws.amazon.com/secrets-manager/).  

The template snippet below demonstrates this action in the `steps` section of a Backstage Software Template.  See the example in the plugin's [src/example/template.yaml][example_template] file to better understand the action in the context of a full template.

This action will generate a `awsSecretArn` output which can be referenced in subsequent scaffolder steps.

```yaml
# template.yaml

...
  steps:
    ...
    - id: createSecretManager
      name: Creates a Secret
      action: baws:create-secret
      input:
        # The name of the SecretsManager secret
        secretName: ${{ parameters.component_id }}-gitlab-access-token
        # The AWS region where the secret will be created
        region: ${{ steps['bawsDeployECSBoilerplate'].output.region }}
        # The AWS account in which the secret will be created
        accountId: ${{ steps['bawsDeployECSBoilerplate'].output.account }}
        # a description of the secret
        description: "Gitlab repo access token"
        # AWS tags to apply to the Secret
        tags:
          - Key: "aws-apps:${{ parameters.component_id }}"
            Value: ${{ parameters.component_id }}
    ...

```

### Create Gitlab Repo Access Token

The `baws:createRepoAccessToken:gitlab` scaffolder action creates a [project access token][gitlab_pat] where access is restrited to a specific Gitlab repository.  

The template snippet below demonstrates this action in the `steps` section of a Backstage Software Template.  See the example in the plugin's [src/example/template.yaml][example_template] file to better understand the action in the context of a full template.

```yaml
# template.yaml

...
  steps:
    ...
    # Create a new Gitlab project access token for the newly created repo
    # and store the access token in an AWS Secret
    - id: createRepoToken
      name: Create Repo Token
      action: baws:createRepoAccessToken:gitlab
      input:
        # the url of the gitlab repository
        repoUrl: ${{ parameters.repoUrl }}
        # the project id of the gitlab repo
        projectId: ${{ steps['publish'].output.projectId }}
        # the ARN of the Secrets Manager Secret where the access token should be 
        # securely stored
        secretArn: ${{ steps['createSecretManager'].output.awsSecretArn }}
    ...

```

<!-- link definitions -->
[gitlab_pat]: https://docs.gitlab.com/ee/user/project/settings/project_access_tokens.html 'Gitlab Project Access Tokens'
[buildspec_ref]: https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html 'Build specification reference for CodeBuild'
[example_template]: src/example/template.yaml