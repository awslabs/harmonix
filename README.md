<img src="./docs/images/harmonix-blue.png"
     alt="Harmonix on AWS"
     style="margin-right: 10px;max-height: 400px; " />

:star: **Harmonix on AWS v0.3.4 now available!** :star:
* Upgraded Harmonix on AWS to the latest Backstage version and new backend system. 1.29.0
* New custom entity processor plugin - compatible with the new backend backstage system. details here
* Updated Gitlab version 17.2.2
* Support for Github and Multi-Git provider
* New template examples - including Terraform ECS cluster
* New SecretsManager shared resource template
* New entity Schema updates - gitProvider, componentState, component spec subType details here
* General package version updates
* Bug fixes


:star: **Harmonix on AWS v0.3.3** :star:
* S3 Bucket as a shared resource
* Reuse existing VPC when creating providers
* Amazon ECS provider with EC2 clusters for tailored workloads
* Amazon EKS provider
* Import existing Amazon EKS clusters
* Amazon EKS Application for K8s Kustomize pattern
* Amazon EKS Application for K8s Helm pattern
* CI/CD patterns for K8s applications
* Updated Backstage platform to v1.21
* Filter relevant environments for new apps

Refer to the [CHANGELOG](https://harmonixonaws.io/docs/CHANGELOG) for a complete list of new features and capabilities.
# Harmonix on AWS (Previously known as OPA on AWS)

Harmonix Provides a new developer experience to simplify the use and consumption of AWS services while minimizing required expertise in cloud infrastructure technologies.  
Built on the [Backstage open platform](https://backstage.io), this solution makes the AWS cloud more accessible to application developers allowing them to focus on building application logic and delivering business value.

This solution leverages the flexibility and extensibility of the Backstage platform to provide customizable software templates, scaffolder actions, and deployment patterns. While this provides a lot of freedom in implementation, it can be overwhelming to get started.  To help users get started, a reference repository is also provided with samples to show how to use the solution.

:clapper: **Demonstrations and Tutorials**

[Harmonix on AWS Website](https://harmonixonaws.io) <br/>
[Harmonix on AWS Documentation](https://harmonixonaws.io/docs/intro) <br/>
[Tutorial YouTube videos](https://harmonixonaws.io/docs/getting-started/videos)

## Getting Started
Please see our [Getting started documentation](https://harmonixonaws.io/docs/getting-started/deploy-the-platform)

## 1. Architecture Overview
See our [high level architecture](https://harmonixonaws.io/docs/techdocs/architecture)
For details on the solution architecture lower level design. ->  [ARCHITECTURE.md](./docs/ARCHITECTURE.md)   

## 2. Installation
Please see our [Installation instructions](https://harmonixonaws.io/docs/getting-started/deploy-the-platform)

## 3. FAQs
Please see our [FAQs page](https://harmonixonaws.io/docs/faq)

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This project is licensed under the Apache-2.0 License.


## Customized Harmonix

The following indications may help in deploying Harmonix to an already-existing architecture.

**First of all : fork/copy this project before applying customizations !**

### Change from Okta to another IdP

Harmonix uses Okta as the default identity provider. If you need to use another identity provider [supported by Backstage](https://backstage.io/docs/auth/#built-in-authentication-providers), follow these instructions :

* Remove any `OKTA_*` variable from the `config/.env` file.
* Replace them with any configuration value that could be used to configure the new Identity Provider (don't forget to add a variable to hold the name for 
the secret which will be created out of these values)
* In `build-script/secure-secrets-creation.sh`, add a block corresponding to the variables you just added and store them in a secret.
* In `iac/roots/opa-platform/src/constructs/backstage-fargate-service-construct.ts` :
     * Change the `secretVars` attribute to match with yours.
     * Change the `oktaSecret` prop to match with the secret you created
* In `iac/roots/opa-platform/src/opa-platform-stack.ts`, change the `oktaSecret` in the `BackstageFargateServiceConstruct` constructor call to match with
the change you made just before.
* Reference these newly-created environment variables in the Backstage configuration (`config/app-config.aws-production.yaml`)

### GitLab is already deployed

Harmonix deploys GitLab and GitLab Runner for you on EC2 instances. If you have those already deployed where you want to implement Harmonix, follow these instructions.

#### Remove GitLab and GitLab runner provisioning instructions

Both apps are deployed through the CDK stack, using plain EC2 instances and user-data scripts. 

To disable the provisioning step, comment every reference to `GitlabHostingConstruct` and `GitlabRunnerConstruct` in `iac/roots/opa-platform/src/opa-platform-stack.ts`.

#### Bootstrap GitLab

The user-data script provided to the GitLab instance manages the package installation, but it also does administration tasks on GitLab itself to create what's 
needed for Harmonix to work properly.

##### Create the backstage-reference repository

This repository will hold every template used by Harmonix. Create it somewhere in GitLab, and add it as an URL location in your Backstage
configuration (replace group with yours) :

```yaml
catalog:
  locations:
    - type: url
      target: https://gitlab.ippon.fr/REPO_GROUP/backstage-reference/-/blob/main/templates/all-templates.yaml
      rules:
        - allow: [Location, Template]
```

Then, clone the repository and execute the following commands (replace with the correct paths and values for your use cases) :

```sh
appDir=path/to/harmonix
repoDir=path/to/backstage-reference
GITLAB_HOSTNAME=gitlab.example.com
AWS_ACCOUNT_ID=123456789012

rsync -a --delete --exclude='**/node_modules' --exclude='**/cdk.out' --exclude='**/.git' $appDir/backstage-reference/ $repoDir

rsync -a --delete --exclude='**/node_modules' --exclude='**/cdk.out' $appDir/iac/roots/{opa-common-constructs,opa-ecs-environment,opa-ecs-ec2-environment,opa-eks-environment,opa-serverless-environment,opa-gen-ai-environment} $repoDir/environments

cp $appDir/iac/roots/package.json $repoDir/environments


cd $repoDir;

# Replace variable placeholders with env specific information
if [[ "$OSTYPE" == "darwin"* ]]; then
    find . -type f -name "*.yaml" -exec sed -i "" "s/{{ *gitlab_hostname *}}/$GITLAB_HOSTNAME/g" {} +; 
    find . -type f -name "*.yaml" -exec sed -i "" "s/{{ *awsAccount *}}/$AWS_ACCOUNT_ID/g" {} +; 
else
    find . -type f -name "*.yaml" -exec sed -i "s/{{ *gitlab_hostname *}}/$GITLAB_HOSTNAME/g" {} +; 
    find . -type f -name "*.yaml" -exec sed -i "s/{{ *awsAccount *}}/$AWS_ACCOUNT_ID/g" {} +; 
fi

```

And commit and push.

You also need to allow the following list of resources (ignore if already allowed) otherwise they won't be referenced as locations :
```yaml
# For the Gitlab plugin (does not interfere with discovery)
gitlab:
  allowedKinds:
    - Component
    - Resource
    - AWSApp
    - AWSEnvironment
    - AWSResource
    - AWSEnvironmentProvider

catalog:
  providers:
    gitlab:
      ippon:
        #...
        rules:
          - allow: [Component, System, API, Resource, User, AWSEnvironmentProvider, AWSEnvironment, AWSResource, AWSApp]
```

##### Groups (with internal visibility)

* aws-app
* aws-environments
* aws-environment-providers
* aws-resources

It is recommended to create these groups in a "main group" where CI/CD variables can be set to avoid modifying the Harmonix reference
templates.

For instance, if you want to use OIDC authentication from your runners to AWS, you can create an [id_token](https://docs.gitlab.com/ee/ci/yaml/#id_tokens) in the `backstage-reference` templates with the correct audience (usually, the URL of your GitLab instance).
It is recommended to set this token in the CI files located in the `common` tree, which will be imported from the `.gitlab-ci.yml` files in `templates`, as these one might get modified
in some cases (especially for AWS resources).

Then set `AWS_WEB_IDENTITY_TOKEN_FILE` (as file, with the value referencing the OIDC token variable name), `AWS_ROLE_ARN` and
`AWS_ROLE_SESSION_NAME` in this group, and from there the first calls to the AWS API will be authentified correctly.

##### Secrets

* Create an access token with permissions on the groups listed above, and put it as `apiToken` in the `opa-admin-gitlab-secret` secret in Secrets Manager.

These resources will host the repositories with the needed CI/CD files for deploying
environments, providers and resources through Harmonix.

#### Set up GitLab Runner

The only thing required for the GitLab Runner instance/executor is that the IAM permissions must fit with Harmonix's architecture.

To achieve this, the IAM role ARN attached to the existing executor must be added in the environment role assumption policy (see [here](https://github.com/awslabs/harmonix/blob/fd3d3e2c41f68775e69259d70f2e8e500f885234/iac/roots/opa-platform/src/opa-platform-stack.ts#L241)).

### Backstage is already deployed

#### Note : Harmonix roadmap

At the time this README is written (Jan 6th 2025), there is an open PR on 
the upstream Harmonix repository : https://github.com/awslabs/harmonix/pull/126/files. 
It aims to decouple "deploying the Harmonix platform requirements" and "adding Harmonix to a Backstage distribution".
The diffs are huge but there are a lot of formatting and linting diffs.

#### Plugins

Install the required dependencies :

```sh
# Install backend dependencies
echo "" #intentional blank line
echo "Installing backend dependencies"
yarn --cwd packages/backend add \
    "@backstage/plugin-catalog-backend-module-github@^0.6.5" \
    "@backstage/plugin-catalog-backend-module-gitlab@^0.3.21" \
    "@backstage/plugin-permission-backend@^0.5.46" \
    "@roadiehq/catalog-backend-module-okta@^0.10.0" \
    "@roadiehq/scaffolder-backend-module-utils@^1.17.1" \
    "@immobiliarelabs/backstage-plugin-gitlab-backend@^6.6.0" \
    "@aws/plugin-aws-apps-backend-for-backstage@${AWS_APPS_BACKEND_VERSION}" \
    "@aws/plugin-scaffolder-backend-aws-apps-for-backstage@${AWS_APPS_SCAFFOLDER_VERSION}" \
    "@aws/backstage-plugin-catalog-backend-module-aws-apps-entities-processor@${AWS_APPS_CATALOG_PROCESS_VERSION}"

# Install frontend dependencies
echo "" #intentional blank line
echo "Installing frontend dependencies"
yarn --cwd packages/app add \
    "@immobiliarelabs/backstage-plugin-gitlab@^6.6.0" \
    "@backstage/plugin-github-actions@^0.6.11" \
    "@aws/plugin-aws-apps-for-backstage@${AWS_APPS_VERSION}" \
    "@backstage/plugin-home" \
    "@aws/plugin-aws-apps-demo-for-backstage@${AWS_APPS_DEMO_VERSION}"

```
In that case, plugins need to be installed in Backstage manually. Follow the instructions in each plugin's README.


#### IAM roles and their use case

Harmonix extensively uses IAM roles with assumption policies to segment permissions and ensure that, by default, nothing implied in the Harmonix infrastructure holds
too much permissions. When needed and temporarily, the Backstage app or the runners will assume a role that will allow them to act on a given environment or application
deployed through a template. Here is a reminder list of every role that you could find in the documentation.

* Harmonix-managed roles:
     * The **provisioning role**: this role will be assumed by the Gitlab Runner when deploying an app on an environment
     * The **operation role**: this role will be assumed by Backstage when managing an AWS resource.

* User-managed roles:
     * The **environment role**: this is a role that must be assumable by the Gitlab runners to provision environments.
          * See [here](https://github.com/awslabs/harmonix/blob/fd3d3e2c41f68775e69259d70f2e8e500f885234/iac/roots/opa-platform/src/opa-platform-stack.ts#L249) for the recommended permissions.
     * The **pipeline role**: this is the role that the Gitlab Runners hold by default.
          * See [here](https://github.com/awslabs/harmonix/blob/fd3d3e2c41f68775e69259d70f2e8e500f885234/iac/roots/opa-platform/src/constructs/gitlab-runner-construct.ts#L135) for the recommended permissions.
          * This role does not need base permissions other than the usual SSM and CloudWatch managed policies (that do not impact Backstage).
     * The **platform role**: this is a role that is assumed by the Backstage application (ECS task, EKS IRSA/Pod identity, EC2 instance profile...).
          * See [here](https://github.com/awslabs/harmonix/blob/main/iac/roots/opa-platform/src/constructs/opa-role-construct.ts#L31)
          for the recommended permissions.
     * The pipeline and platform role ARNs will be stored in SSM Parameter Store to be inserted in the assumption policy of the provisioning and operations
     roles respectively.

#### Platform

Some resources are normally created through the CDK stack used by the Makefile's `deploy-platform` target. If you decide to deploy Harmonix on an existing Backstage distribution, these resources must be created separately :

* A role (called the **environment role**) must be created and assumable by the runners used by the pipelines created through the Harmonix templates. It must have every permission needed to provision any resources needed by the Harmonix environment provider templates. This role's ARN must be noted and kept available when
creating providers from the Backstage UI.

* Two SSM parameters :
     * An SSM Parameter named `/opa/platform-role` must be set with its value holding the Backstage role ARN.
     * An SSM parameter named `/opa/pipeline-role` must be set with its value holding the ARN of the role used by the Runners.
     * Both parameters will be used when provisioning the environment providers (to give assume rights on the provisioning and operations roles, see [the docs](https://harmonixonaws.io/docs/techdocs/architecture#harmonix-on-aws-platform))
