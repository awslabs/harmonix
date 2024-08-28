---
sidebar_position: 1
---

# Installation

Installing Harmonix on AWS solution will provide you with the complete reference implementation including authentication/authorization, a Backstage platform instance, source code management, and CI/CD pipelines. By following this guide you will:

- Deploy the AWS infrastructure required to run Harmonix on AWS
- Deploy a GitLab source code management instance including provisioning of resources to run CI/CD pipelines
- Configure authentication/authorization using Okta as the identity provider (Backstage supports [several other identity providers](https://backstage.io/docs/auth/))
- Deploy a sample repository of example software templates to create apps, environments, and resources for AWS

## Prerequisites

### Software prerequisites


The following software is required to perform the installation of the platform solution:
- Unix-based operating system (Linux, MacOS, or the Windows Subsystem for Linux)
- [node.js](https://nodejs.org/en/) - 18.20 or higher
- [yarn](https://classic.yarnpkg.com/en/docs/install) - v1.x (Yarn classic)
- [aws-cli](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- [aws-cdk](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html#getting_started_install)
- [jq](https://stedolan.github.io/jq/)
- [docker](https://www.docker.com/)
- [git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [python](https://www.python.org/downloads/)
*Make sure to use Python 3.11, Python 3.12+ has issues due to distutils removal*

:::note
The installation instructions documented here were tested using the following versions:
- node v18.19
- aws-cdk v2.95
- yarn 1.22.21
- python 3.11
:::

### Solution Platform prerequisites

Prior to installing the Harmonix solution platform, you will need to ensure that the following items are configured and available:

* **AWS Account ID and region** - The solution will be installed into an AWS account and region.  You will need the 12-digit account ID and must be able to log into the account with sufficient permissions to provision infrastructure resources.

* **Route 53 Hosted Zone** - The solution will ensure secure communcations and set up a certificate for your defined domain.  Ensure that a public hosted zone is set up in your account.  See the AWS documentation for [creating a public hosted zone](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/CreatingHostedZone.html)

* **Okta authentication** - The solution uses Okta and RoadieHQ Backstage plugins for authentication of users and groups.  You will need a client id, client secret, and API key for configuration of the solution.  If you wish to use Okta for authentication and do not have an existing account, you can [sign up a free *Workforce Identity Cloud* developer account](https://developer.okta.com/signup/).  
  * Once the account is set up, you will need to [configure an Okta API key](https://developer.okta.com/docs/guides/create-an-api-token/main/) for the [RoadieHQ backend catalog plugin](https://www.npmjs.com/package/@roadiehq/catalog-backend-module-okta)
  * A client id, secret and audience  are required to set up a Backstage Okta authentication provider.  See the [Backstage Okta auth documentation](https://backstage.io/docs/auth/okta/provider) for more details.  
  * Other identity providers are supported and could be substituted using different plugins.  Configuring alternative authentication is not covered in this documentation.  Refer to the [Backstage Authentication documentation](https://backstage.io/docs/auth/) for details to install and configure alternative providers.

## Installation

1. Clone the repository and change to the repository location
   ```sh
   git clone https://github.com/awslabs/harmonix.git
   cd harmonix
   ```

2. Configure the solution
   1. Copy the `config/sample.env` file to `config/.env`
   2. Edit the `config/.env` file and provide values for all of the environment variables.  The file is commented to explain the purpose of the variables and requires some of the information from the [Solution Platform Prerequisites](#solution-platform-prerequisites) section above.  
   :::info
   The `SECRET_GITLAB_CONFIG_PROP_apiToken`, `OKTA_IDP` and `OKTA_AUTH_SERVER_ID` variables **do not** need to be provided.  This will be automatically configured during installation after the platform is deployed.
   :::

3. Perform the installation
   1. Run `make install`  
   The Makefile target will automatically perform the following actions:
      * Install and configure Backstage
      * Install/update CDK
      * Deploy the solution platform AWS infrastructure
      * Update the configuration with GitLab information
      * Push a sample repository to GitLab
      * Build and deploy the Backstage image to AWS

   - After the installation completes, the application will start up.  Open a browser and navigate to the 'Harmonix on AWS' endpoint using the Route 53 hosted zone name that you configured (e.g. `https://${R53_HOSTED_ZONE_NAME}`). 
   - If any errors occur during installation, please review the `install_{datestamp}.log` file for details.
   - a new secret manager's secret named `opa-admin-gitlab-secrets` contains the Gitlab admin's credentials for

  
   

## Installation FAQs

**I don't use Okta. Can i change the identity provider to another one?**  
> Yes.  Backstage [supports many identity providers](https://backstage.io/docs/auth/).  Once you configure Backstage for your chosen provider, make sure the Backstage catalog is synced with the users and groups from your provider.
<br/>

**I want to use another source control that is not GitLab. How can i do that?**  
> Backstage supports multiple source control providers which can be integrated through the Backstage config. Harmonix uses GitLab for several usage scenarios which you will need to migrate to another source control provider:
> 
> 1. Storing application source code
> 2. Storing template source code
> 3. Storing pipelines jobs and orchestration
> 4. Update the Client API plugin that interacts with GitLab to the new source control provider
<br/>

**I'm using Terraform, can I use this solution with Terraform to provision application resources?**  
> Yes. We provide a Node.js Terraform application software template for demonstration.  You may also write your own provider with Terraform.
<br/>

For more Q & A please see our [FAQ Page](../faq.md)
