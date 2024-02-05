---
sidebar_position: 1
---

# Architecture

## OPA Platform

The below diagram illustrates the major components of the OPA platform. 

The platform creation is automated by way of executing an AWS CDK script that will provision the needed resources in your AWS account. After running the script, you will have the Backstage developer portal running on AWS and it will be set up to persist its configurations to an RDS database. Backstage will be integrated with an identity provider to facilitate user logins. The default identity provider is Okta, but you can customize this to use a different one. 

Backstage is also integrated with a version control system. It is configured to discover entity definition files in existing Git repositories so that these entities will show up in the portal. Backstage will also be able to create new repositories to hold the source code of applications and other resources that are created by portal users. 

The default OPA version control system is GitLab. The platform creation scripts will set up a Community Edition of GitLab that runs on AWS, so that it can be used for demonstration purposes. It is possible through code modifications to switch to a different version control vendor that can be hosted on or outside of the AWS cloud. 

<p align="center">
![Website_Architecture_OPA_Platform.jpg](/img/diagrams/opa-architecture.png)
</p>

## Application Environments

The below diagram illustrates the relationships between an application and the environments it gets deployed to.

An environment is just a Backstage entity that contains metadata and associations with other entities such as applications and providers. Environment providers are more than just Backstage entities. Providers are backed by Git repositories that contain Infrastructure as Code scripts that provision resources to a specific AWS account and region. The provider's resources are created to support running applications of a certain type, such as containerized apps that will be run on a cluster or serverless apps.

<p align="center">
![Website_App_Environments.jpg](/img/diagrams/Website_App_Environments.jpg)
</p>

## AWS Cloud Components of an Environment Provider

The below diagram illustrates the AWS cloud components that make up an environment provider that could be used to host a containerized application.

Every provider must include a security role for Backstage CICD pipelines to use to provision and update applications in a specific AWS account and region. Providers's must also contain an operations role, which is assumed by the Backstage portal to grant it access to execute the operations that portal users are choosing. The final requirement of a provider is that it must contain an audit table, which OPA uses to track user actions made to applications running on the provider's account.

Providers can also commonly include networking configurations, encryption keys, and secrets.

<p align="center">
![EnvironmentProviderComponents.png](/img/diagrams/EnvironmentProviderComponents.png)
</p>

## How an Application Gets Created

Applications are created when developers log into Backstage and select an existing application template that meets their needs. They are then asked to fill in a form with vital information, such as the application's name and the environment it will run on. 

Backstage will create a new Git repository to hold the application's code, its CICD pipeline definition, and its Backstage entity definition. Backstage reads the entity definition so that the new application will show up on the portal. 

When the Git repository is created, its CICD pipeline will execute, resulting in resources being provisioned on AWS. Once the pipeline has finished, Backstage users will be able to see many attributes of the application, such as its running state and logs. They will also be able to perform operations on the application, such as changing environment variables or pushing a new release.

<p align="center">
![Website_How_An_Opa_App_Gets_Created.jpg](/img/diagrams/Website_How_An_Opa_App_Gets_Created.jpg)
</p>

## Application CICD Pipeline

The below diagram illustrates an application's CICD pipeline. The application is associated with 3 environments (DEV, QA, PROD). 

OPA is able to create pipelines like this for you when it creates a new application. These pipelines are capable of deploying to as many AWS accounts as you need.

<p align="center">
![CICD_With_AWS.jpg](/img/diagrams/CICD_With_AWS.jpg)
</p>
