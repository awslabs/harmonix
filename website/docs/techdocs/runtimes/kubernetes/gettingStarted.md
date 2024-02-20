---
sidebar_position: 1
---

# Getting Started

Before you can deploy a kubernetes application, you'll need to create a cluster to run it on. AWS provides the [Elastic Kubernetes Service (EKS)](https://aws.amazon.com/eks/) for customers who want to run kubernetes clusters in the AWS cloud.

OPA encapsulates environment runtime infrastructure, including EKS clusters, in a concept called an [Environment Provider](/docs/techdocs/entities#aws-environment-provider). Environment Providers are reusable templates that create infrastructure resources on a specific AWS account and region in order to support a specific workload type (e.g. [EKS](https://aws.amazon.com/eks/), [ECS](https://aws.amazon.com/ecs/), [Serverless](https://aws.amazon.com/serverless/)). 

Environment Providers are implemented using Infrastructure as Code (IaC) scripts that provision the needed resources. OPA comes out of the box with 2 [templates to create EKS Environment Providers](/docs/category/eks-provider-templates). The first template will create a new EKS cluster as well as supporting infrastructure components. The second template allows you to use/import an existing EKS cluster and creates only the supporting infrastructure components. The Environment Provider templates provided by OPA can be customized to meet your needs, or you can simply use them as a reference and create your own template(s) from scratch.

## Creating an EKS Environment Runtime

Before you can deploy an application to one of your clusters via OPA, you'll need to perform these steps in the OPA/Backstage UI, which are typically performed by someone in the Platform Engineering role:

1. Create a new EKS [Environment Provider](/docs/techdocs/entities#aws-environment-provider) by selecting the provider template you want to use and fill out the form to create it. Note that if your template creates a new cluster, it may take 30-60 minutes before the IaC finishes running.
1. Create a new [Environment](/docs/techdocs/entities#aws-environment) and select the provider that you just created. This establishes an association between an Environment and a Provider.
1. Optionally, you can view the Environment and the Environment Provider from the OPA/Backstage UI. 
    * Doing so will show you valuable information about the entity, such as metadata and relationshipts with other entities. The UI will also provide you with a link to the Git repository that contains the configurations and code (if there is any) for the entity you are viewing.

    :::info
    Environment Providers come with their own CICD pipelines that execute their IaC scripts. These pipelines will run automatically to deploy changes if the IaC scripts change.
    :::

## Creating a Kubernetes Application

Once you have set up an EKS environment via OPA, you or your development team can use the OPA/Backstage UI to choose from one of the EKS application templates. Several template examples are provided out of the box, which you can customize or use as a reference when creating your own application templates. OPA provides example applications written in Java/SpringBoot, NodeJs, and Python. After choosing a template to base your new application on, complete the UI wizard and select to deploy the application to the Environment that was created in the previous steps.

Clicking the button to create an application will trigger a new Git repository to be created, which contains your application code as well as kubernetes manifest files written using either [Kustomize](https://kustomize.io/) or [Helm](https://helm.sh/) (depending on the application template you selected). The repository will have a CICD pipeline that builds a container image and deploys the application to the selected Environment. After an application has been created, it can be configured to be deployed to additional Environments via the Management tab.

:::info
As of OPA version 0.3.2, all application template examples utilize a traditional CICD pipeline approach and do not follow a GitOps process. This is not due to an OPA limitation, but rather due to the OPA team wanting to release support for kubernetes more quickly. This documentation will be updated if/when a GitOps example becomes available. As always, since OPA is open source, users are free to modify the deployment process to suit their needs. 
:::
