---
sidebar_position: 2
---

# Deploying Your Application 

Before you can deploy your Gen AI Chatbot, you'll need to create the environment for it to run in. Harmonix encapsulates environment runtime infrastructure, in a concept called an [Environment Provider](/docs/techdocs/entities#aws-environment-provider). Environment Providers are reusable templates that create infrastructure resources on a specific AWS account and region in order to support a specific workload type.

Environment Providers are implemented using Infrastructure as Code (IaC) scripts that provision the needed resources. Harmonix comes out of the box with the Gen AI Environment Provider that will support the Gen AI Chatbot App. The template will create the underlying resources that enable your app creation. This includes resources such as a KMS key, audit table, and the IAM roles used by Harmonix. The Environment Provider templates provided by Harmonix can be customized to meet your needs, or you can simply use them as a reference and create your own template(s) from scratch.


## Creating a Gen AI Environment Runtime

Before you can deploy an application to one of your clusters via Harmonix, you'll need to perform these steps in the Harmonix/Backstage UI, which are typically performed by someone in the Platform Engineering role:

1. Create a new Gen AI [Environment Provider](/docs/techdocs/entities#aws-environment-provider) by selecting the Generative AI provider template. Fill in the required information and wait for your resources to deploy. This may take several minutes.
1. Create a new [Environment](/docs/techdocs/entities#aws-environment) and select the provider that you just created. This establishes an association between an Environment and a Provider.
1. Optionally, you can view the Environment and the Environment Provider from the Harmonix/Backstage UI. 

    * Doing so will show you valuable information about the entity, such as metadata and relationshipts with other entities. The UI will also provide you with a link to the Git repository that contains the configurations and code (if there is any) for the entity you are viewing.

    :::info
    Environment Providers come with their own CICD pipelines that execute their IaC scripts. These pipelines will run automatically to deploy changes if the IaC scripts change.
    :::


## Deploying the Gen AI Application 

Once the Gen AI runtime environment is configured, you are ready to deploy your Gen AI Chatbot App. 

1. Select the Generative AI Chatbot Application software template and enter the information as prompted. Be sure to select the environment that you just created as the target environment for your application. 

1. Wait for the pipeline to finish. Progress of the pipeline can be found in GitLab CI/CD.

1. Once the pipeline is completed, navigate to the application's component page on the Harmonix on AWS UI. This is where you will find all of the important information about your application. 
1. Find the entity card that says *Application State* and select **Deploy App**. This will trigger the final IaC deployment of your application's resources in AWS CloudFormation. Once the Stack is successfully deployed, you are ready to begin interacting with your application.

