---
sidebar_position: 1
---

# Create Environments

We'll use Backstage's software template feature to efficiently provision our application's runtime environments. OPA on AWS provides different types of environments. the process is similar and can also be extend or modify.

## Create an Environment Provider

Lets now use AWS ECS Environment Provider template to provision our AWS Elastic Container Service(ECS) runtime environment. If you have completed the introduction section, you should be on the OPA landing page.

1. Hit the Create.. menu on the left and Choose the AWS ECS Environment Provider template.

![alt text](/img/docs/ecs-env-provider-1.png)

2. Provide input parameters to tailor the environment provider resources.


| Parameter            | Value                                                                                                               | Description                                                                                |
| :------------------- | :------------------------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------- |
| **Name**                 | ```banking-dev-provider```                                                                  | A unique identifier for the environment provider                                           |
| **Prefix**               | ```bankecs```                                                                     | A short prefix used for AWS resource creation                                              |
| **Description**          | ```A Dev environment provider for containerized Retail Banking applications```                | Describes what the environment provider's purpose will be                                  |
| **Owner**                | Select 'developers'                                                                                                 | The group or user that will be responsible for the entity                                  |
| **AWS Account Number**   | _get this value from the **aws-account-id** key on the **Event Outputs** section of the Event Dashboard_            | The AWS account where the environment provider will be created                             |
| **AWS Region**       | Select 'US East (N. Virginia)'<br/>_Do not select any other region for the workshop_                                | The AWS region to provision resources in                                                   |
| **Environment role arn** | _get this value from the **opa-env-provisioning-role-arn** key on the **Event Outputs** tab of the Event Dashboard_ | The IAM role to be used for provisioning AWS resources in the target account and region    |
| **CIDR**                 | 10.0.0.0/24 _(default)_                                                                                             | The CIDR block to be provisioned for the VPC associated with the ECS cluster to be created |

![alt text](/img/docs/ecs-env-provider-2.png)


**3.** Select **Next Step** and Provide Repository information

In this step we provide information about the git repository where the Environment Provider source files will be published as part of executing the Software Template.

| Parameter | Value | Description |
| :- | :- | :- |
| Host: | *default value* | The GitLab host name |
| Owner: | *default value* | The GitLab namespace where this repository will belong to.<br/>It can be the name of organization, group, subgroup, user, or the project |
| Repository: | ```banking-dev-provider``` | The name for the git repository |

![alt text](/img/docs/ecs-env-provider-3.png)


**4.** Select **Next Step**, review your inputs and select **Create**

![alt text](/img/docs/ecs-env-provider-4.png)


**5.** Environment Provider Entity Creation

Upon clicking Create, the template performs automated action steps. It gets info from AWS, fetches our ECS code and other configuration files from the reference folder, changes specific parts inside these files, and sets up a new git folder to store the files.

![alt text](/img/docs/ecs-env-provider-5.png)

Once this git folder is ready, a CI/CD process will start automatically. It will use the code to set up your new ECS platform right away!

Now, let's proceed to the next step to an environment using the provider entity we just created. 


## Create an Environment

To create an Environment Entity we will use the **AWS Environment** template from the software catalog section.

**1.** On the OPA on AWS website, navigate to the **Create..** menu. From the list of available templates, choose the **AWS Environment** template card.
![alt text](/img/docs/ecs-env-1.png)

**2.** Provide input parameters to tailor the environment entity and click **Next Step**

| Parameter | Value | Description |
| :- | :- | :- |
| **Name** | ```banking-dev``` | A unique identifier for the environment |
| **Short Name** | ```bankdev``` | A short identifier used for identification of environments |
| **Description** | ```Banking Development environment for containerized applications deployed to ECS``` | Describes the purpose of the environment |
| **Environment Type** | AWS ECS | Specifies the type of applications that can be deployed and managed in this environment |
| **Deployment Requires Approval** | No | Allows for blocking a CI/CD pipeline until approval is received.  This is often set to 'No' for development and test, but 'Yes' for production |
| **Owner** | developers | The group or user that will be responsible for the entity. |
| **Account Type** | Single-account | Indicates whether the environment supports one or more accounts |
| **Region Type** | Single-region | Indicates whether the environment supports one or more regions |
| **Category** | Development | Identifies the intended purpose of the environment (dev, test, prod, etc) |
| **Classification** | public | Identifies visibility of the environment (public-facing, internal-facing, or private) |
| **System** | ```banking``` | Identifies the relationship of this environment to a larger system.  This can be used to group environments together. |
| **Heirarchy of the Environment** | 1 | Value used to determine relative ordering for environments.  Typical approaches are to use lower numbers for development and higher numbers for production. |
| **Providers** | banking-dev-provider | Selects one or more environment providers to attach to this environment.  In this workshop, there is only one environment provider available, so the drop-down list is disabled and the available environment provider will be used. |

![alt text](/img/docs/ecs-env-2.png)


**2.** Hit **Next Step** and fill in the remaining information:


| Parameter | Value | Description |
| :- | :- | :- |
| **Host** | *default value* | The GitLab host name |
| **Owner** | *default value* | The GitLab namespace where this repository will belong to.<br/>It can be the name of organization, group, subgroup, user, or the project |
| **Repository** | ```banking-dev``` | The name for the git repository |


![alt text](/img/docs/ecs-env-3.png)
**3.** Hit **Next Step** and review your inputs. Hit **Create**

![alt text](/img/docs/ecs-env-4.png)


**4.** The template scaffolding action will fetch a catalog.yaml file (used to define entities), replace the placeholders with our input we just set, push the file to a new repo and register it to OPA on AWS. 
![alt text](/img/docs/ecs-env-5.png)


Now that our Environment Entity is created, our developers can discover and point to the it during their app scaffolding process. Let's proceed to the next step and explore the ECS Environment Entity we just created. 


