# App Development for Backstage<!-- -->.io on AWS

**App Development for Backstage<!-- -->.io on AWS** provides a new developer experience to simplify the use and consumption of AWS services while minimizing required expertise in cloud infrastructure technologies.
Built on the [Backstage open platform](https://backstage.io), this solution makes the AWS cloud more accessible to Application Developers allowing them to focus on building application logic and delivering business value.

The solution is composed of two parts:

1. AWS Infrastructure to provide the build, deployment, and security requirements in the AWS cloud
2. Backstage plugins to support AWS application development and management.

This solution leverages the flexibility and extensibility of the Backstage platform to provide customizable software templates, scaffolder actions, and boilerplate deployment configurations. While this provides a lot of freedom in implementation, it can be overwhelming to get started.  To help users get started, a reference repository is also provided with samples to show how to use the solution.

## Content

1. Architecture overview
2. Installation instructions
3. FAQs

## 1. Architecture Overview

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

## 2. Installation

After cloning this repository, change directory to the repository location and perform the following steps to deploy the complete solution:

1. Install and configure Backstage and plugins
2. Deploy Infrastructure
    1. Deploy and configure infrastructure prerequisites
    2. Build and deploy the Backstage image
    3. Deploy and configure the infrastructure solution

### 2.1. Install and configure Backstage

A makefile target will automatically install the Backstage application and plugins used in the solution.  The target will also copy over modifications to the base Backstage files to simplify the configuration for each of the plugins.  

```sh
make backstage-install
```

**Note**: Later releases of Backstage may modify the base versions of these files and the overwrite action may wipe out intended Backstage changes.  If you would prefer to perform manual customization of Backstage to understand the modifications to the Backstage application, you can follow the manual instructions in the [PLUGIN_INSTALL.md](/docs/PLUGIN_INSTALL.md) file.


### 2.2. Deploy Infrastructure

See the [Infrastructure README.md](/infrastructure/README.md#1-prerequisites) for details about deploying the infrastructure stacks, building and deploying the Backstage image, and configuring the infrastructure solution.

## 3. FAQs

Q. I don't use Okta. Can i change the identity provider to another one?  
A. Yes, Backstage [supports many IDPs](https://backstage.io/docs/auth/), once you configure backstage to your chosen IDP make sure backstage catalog is synced with the users and groups from your IDP. don't forget to update the security role mapping to match the groups in your IDP to the AWS environment roles.
<br><br>

Q. I want to use another source control that is not GitLabs. how can i do it?  
A. Backstage support different source control which can be integrated through backstage config. we use Gitlab for several usage which will need to migrate to another source control provider:

1. Storing application source code
2. Storing template source code
3. Storing catalog information - AWS Environment and AWS Environment providers
4. Executing pipelines that are responsible to build the application when new code is pushed and push the updated image to ECR.


Q. I'm using Terraform, can i use this solution with terraform to provision application resources?  
A. Yes, the step function which is responsible to provision resource for a given Environment can also execute terraform modules. Since it's using AWS CodeBuild behind the scene you can introduce your own software for provisioning resources but also enjoy some of the built-in implementation like passing Environment variables in and out of the step function.

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This project is licensed under the Apache-2.0 License.

