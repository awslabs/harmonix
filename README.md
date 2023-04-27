# App Development for Backstage<!-- -->.io on AWS

**App Development for Backstage<!-- -->.io on AWS** provides a new developer experience to simplify the use and consumption of AWS services while minimizing required expertise in cloud infrastructure technologies.
Built on the [Backstage open platform](https://backstage.io), this solution makes the AWS cloud more accessible to Application Developers allowing them to focus on building application logic and delivering business value.

The solution is composed of two parts:

1. AWS Infrastructure to provide the build, deployment, and security requirements in the AWS cloud
2. Backstage plugins to support AWS application development and management.

This solution leverages the flexibility and extensibility of the Backstage platform to provide customizable software templates, scaffolder actions, and boilerplate deployment configurations. While this provides a lot of freedom in implementation, it can be overwhelming to get started.  To help users get started, a reference repository is also provided with samples to show how to use the solution.

## Architecture Overview

See [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for details about the solution architecture

## Prerequisites

- [node.js](https://nodejs.org/en/) - 18.12 or higher
- [yarn](https://classic.yarnpkg.com/en/docs/install) - v1.x
- [aws-cdk](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html#getting_started_install)
- [jq](https://stedolan.github.io/jq/)
- [docker](https://www.docker.com/)

```
The installation instructions documented here were tested using the following versions:
- Backstage v1.10.1
- node v18.12
- npm 8.19
- cdk v2.59
```

## Installation

After cloning this repository, change directory to the repository location and perform the following steps to deploy the complete solution:

1. Install and configure Backstage and plugins
2. Deploy and configure infrastructure prerequisites
3. Build and deploy the Backstage image
4. Deploy and configure the infrastructure solution

### 1. Install and configure Backstage

#### 1.1 Install Backstage
Install backstage into the `backstage/` folder by running the following command.  When prompted for an application name, accept the default value "**backstage**".  Details about installing a new Backstage deployment are available in the [Backstage Getting Started documentation](https://backstage.io/docs/getting-started/).

```sh
npx @backstage/create-app@latest --path ./backstage
```

#### 1.2 Install and Configure Plugins
Copy and overwrite the contents of the `backstage-plugins` folder into the `backstage` folder.  This will place the plugins into the backstage deployment and add custom configurations to the `app-config.production.yaml` file.
The trailing '/' character after `./backstage-plugins/` is required.

```sh
cp -R ./backstage-plugins/ ./backstage
```

From the `backstage` folder, install Backstage plugins:
```sh
# Install the Okta plugin from RoadieHQ
yarn --cwd packages/backend add "@roadiehq/catalog-backend-module-okta"

# Install the Gitlab plugin from ImmobiliareLabs
yarn --cwd packages/backend add "@immobiliarelabs/backstage-plugin-gitlab-backend"
yarn --cwd packages/app add "@immobiliarelabs/backstage-plugin-gitlab"

# Install the AWS Apps plugins
yarn --cwd packages/backend add "@internal/plugin-aws-apps-backend@^0.1.0"
yarn --cwd packages/backend add "@internal/backstage-plugin-scaffolder-backend-module-aws-apps@^0.1.0"
yarn --cwd packages/app add "@internal/plugin-aws-apps@^0.1.0"

# Install the demo app.  The backstage plugin-home plugin is used by the aws-apps-demo plugin
yarn --cwd packages/app add "@backstage/plugin-home"
yarn --cwd packages/app add "@internal/plugin-aws-apps-demo@^0.1.0"
```

Configure Backstage to use the plugins:

- To use the RoadieHQ Okta plugin, see [RoadieHQ documentation](@roadiehq/catalog-backend-module-okta) for required changes.
- To use the ImmobiliareLabs GitLab plugins, see [ImmobiliareLabs documentation](https://github.com/immobiliare/backstage-plugin-gitlab) for required changes.
- See the README.md documentation for each of the AWS plugins:
  - [AWS apps backend plugin](./backstage/plugins/aws-apps-backend/README.md)
  - [AWS apps scaffolder actions plugin](./backstage/plugins/scaffolder-backend-module-aws-apps/README.md)
  - [AWS apps frontend plugin](./backstage/plugins/aws-apps/README.md)
  - [AWS Home page and theme demo](./backstage/plugins/aws-apps-demo/README.md)

### 2. Deploy Infrastructure Prereq

See the [Infrastructure README.md](./infrastructure/README.md#1-prerequisites) for details about deploying the prereq stack.

### 3. Build and Deploy the Backstage image

After configuration of Backstage and deployment of Infrastructure prereq resources are complete, continue with building and deploying Backstage to the new ECR repository.

The make command below will build a Docker container image and push it to the remote repository.
**Note** You must be logged into your AWS account via CLI in the shell where you run this make command.
```sh
make build-and-deploy-backstage-image
```

### 4. Deploy and Configure the Infrastructure Solution

See the [Infrastructure README.md](./infrastructure/README.md#3-deploy-the-solution-stack) for details about deploying the infrastructure solution stack, GitLab Runner stack, reference repository, and restarting the Backstage service.

### Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

### License

This project is licensed under the Apache-2.0 License.
