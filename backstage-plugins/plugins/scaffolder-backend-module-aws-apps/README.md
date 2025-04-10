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
yarn add --cwd packages/backend @aws/plugin-scaffolder-backend-aws-apps-for-backstage@0.2.0
```

## Configuration

Configure the action(s) you would like to use in your Backstage app.

```ts
// packages/backend/src/plugins/scaffolder.ts

import {
  createRepoAccessTokenAction,
  createSecretAction,
  createS3BucketAction,
  getEnvProvidersAction,
  getComponentInfoAction,
  getSsmParametersAction,
  getPlatformParametersAction,
  getPlatformMetadataAction,
} from '@aws/plugin-scaffolder-backend-aws-apps-for-backstage';

...

const actions = [
  ...builtInActions,
  createRepoAccessTokenAction({ integrations, envConfig:env.config }),
  createS3BucketAction(),
  createSecretAction( {envConfig:env.config}),
  getEnvProvidersAction({ catalogClient }),
  getComponentInfoAction(),
  getSsmParametersAction(),
  getPlatformParametersAction({envConfig:env.config}),
  getPlatformMetadataAction({envConfig:env.config}),
];
...
```

After the scaffolder configuration is updated, you can use the new actions in your Software Templates.

## AWS Apps Scaffolder Actions

Documentation for common usage of the contributed scaffolder actions is included below.
For full documentation of the scaffolder action inputs and outputs, see the https://<your backstage app>/create/actions page in your Backstage app.

The scaffolder actions which create AWS resources will leverage the AWS Environments and Environments Provider model provided in the `@aws/plugin-aws-apps-backend-for-backstage` plugin.
Reference the plugin documentation to understand how to create and surface AWS Environments for use in scaffolder actions and the UI.

### Get Environment Providers

The `opa:get-env-providers` scaffolder action retreives AWS environment providers so that their configurations can be used by other template actions. Refer to the `/create/actions` path of your Backstage instance for details on the returned output.

```yaml
# template.yaml

...
  steps:
    ...
    - id: opaGetAwsEnvProviders
      name: Get AWS Environment Providers
      action: opa:get-env-providers
      input:
        environmentRef: ${{ parameters.environment }}
    ...

```

### Create AWS SecretsManager Secrets

The `opa:create-secret` scaffolder action creates a new Secret in the [AWS Secrets Manager service](https://aws.amazon.com/secrets-manager/).

The template snippet below demonstrates this action in the `steps` section of a Backstage Software Template. See the example in the plugin's [src/example/template.yaml][example_template] file to better understand the action in the context of a full template.

This action will generate a `awsSecretArn` output which can be referenced in subsequent scaffolder steps.

```yaml
# template.yaml

...
  steps:
    ...
    - id: createSecretManager
      name: Creates a Secret
      action: opa:create-secret
      input:
        # The name of the SecretsManager secret
        secretName: ${{ parameters.component_id | lower }}-gitlab-access-token
        # The AWS region where the secret will be created
        region: ${{ steps['opaDeployECSBoilerplate'].output.region }}
        # The AWS account in which the secret will be created
        accountId: ${{ steps['opaDeployECSBoilerplate'].output.account }}
        # a description of the secret
        description: "Gitlab repo access token"
        # AWS tags to apply to the Secret
        tags:
          - Key: "aws-apps:${{ parameters.component_id | lower }}"
            Value: ${{ parameters.component_id | lower }}
    ...

```

### Create Gitlab Repo Access Token

The `opa:createRepoAccessToken:gitlab` scaffolder action creates a [project access token][gitlab_pat] where access is restrited to a specific Gitlab repository.

The template snippet below demonstrates this action in the `steps` section of a Backstage Software Template. See the example in the plugin's [src/example/template.yaml][example_template] file to better understand the action in the context of a full template.

```yaml
# template.yaml

...
  steps:
    ...
    # Create a new Gitlab project access token for the newly created repo
    # and store the access token in an AWS Secret
    - id: createRepoToken
      name: Create Repo Token
      action: opa:createRepoAccessToken:gitlab
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

### Get Platform Metadata

The `opa:get-platform-metadata` scaffolder action retrieves information about the platform and environment on which OPA on AWS is running.

The action will return the AWS region where the platform is running. Future metadata is also planned.

```yaml
# template.yaml

...
  steps:
    ...
    # Get data about the OPA on AWS platform
    - id: opaGetPlatformInfo
      name: Get OPA platform information
      action: opa:get-platform-metadata
    ...

```

### Get Platform Parameters

The `opa:get-platform-parameters` scaffolder action retrieve AWS SSM parameter values for the OPA on AWS platform so that their values can be used by other template actions.

The action will return a `params` response as an object containing a map of SSM parameters.

```yaml
# template.yaml

...
  steps:
    ...
    # Get data about the OPA on AWS platform
    - id: opaGetPlatformParams
      name: Get parameter values
      action: opa:get-platform-parameters
      input:
        paramKeys:
          - '/my/ssm/parameter1'
          - '/my/ssm/parameter2'
    ...

```

The returned object for the example above:

```json
{
  "/my/ssm/parameter1": "Parameter 1's value",
  "/my/ssm/parameter2": "Parameter 2's value"
}
```

### Get SSM Parameters

The `opa:get-ssm-parameters` scaffolder action is very similar to the action above except that it will retrieve AWS SSM parameter values for each environment provider so that their configurations can be used by other template actions. This action is often used in conjunction with the `opa:get-env-providers` action's response of an array of environment providers.

The action will return a `params` response as an object containing a map of SSM parameters keyed off of the environment provider name.

```yaml
# template.yaml

...
  steps:
    ...
    # Get data about the OPA on AWS platform
    - id: opaGetPlatformParams
      name: Get parameter values
      action: opa:get-platform-parameters
      input:
        paramKeys:
          - '/my/ssm/parameter1'
          - '/my/ssm/parameter2'
        envProviders: "${{ steps['opaGetAwsEnvProviders'].output.envProviders }}",
    ...

```

The returned object for the example above:

```json
{
  "env-provider-A": {
    "/A/parameter1": "Parameter 1's value in env-A",
    "/A/parameter2": "Parameter 2's value in env-A"
  },
  "env-provider-B": {
    "/B/parameter1": "Parameter 1's value in env-B",
    "/B/parameter2": "Parameter 2's value in env-B"
  }
}
```

<!-- link definitions -->

[gitlab_pat]: https://docs.gitlab.com/ee/user/project/settings/project_access_tokens.html 'Gitlab Project Access Tokens'
[example_template]: src/example/template.yaml
