---
sidebar_position: 2
---
import ChooseAppImg from '/img/docs/choose-app.png';
import AppComponentInfoImg from '/img/docs/app-component-info.png';
import AppRepoInfoImg from '/img/docs/app-repo-info.png';
import CreateAppImg from '/img/docs/create-app.png';

# Create Apps

In this tutorial, you will build out a new AWS microservice application and deploy it as a into an Environment. By deploying into an Environment designed to run containerized applications in AWS Elastic Container Service (ECS), the application will be automatically packaged and deployed for you as an ECS task in an ECS cluster.

:::info
This tutorial assumes that you have run the [Create an Environment](/docs/tutorials/create-environments) tutorial and expects input values from that setup.  If you have created different Environment entities, then substitute the appropriate values.
:::

**1.** In the OPA on AWS site, navigate to the **Create...** menu. Search for and select **Node.js Express Web App**. 
<center><img src={ChooseAppImg} width="50%" height="auto" /></center>


**2.** Provide application input parameters and select **Next Step** 

| Parameter | Value  | Description |
| :- | :- | :- |
| **Name** | `demo-app` | A unique identifier for the application |
| **Description** | `Node.js demo application running on ECS` | Descriptive information about the application |
| **Owner** | _Select a group from the drop-down list to own the application_ | The group or user that will be responsible for the entity |
| **AWS Environment** | *the **ecs-dev** environment will be pre-selected since it is the only environment available* | The AWS Environment in which you want to deploy your application to. The environment that we created in the previous step will already be selected for you |

<center><img src={AppComponentInfoImg} width="40%" height="auto" /></center>


**3.** Provide Repository information and select **Next Step**

| Parameter | Value  | Description |
| :- | :- | :- |
| **Host** | *default value* | The GitLab host name |
| **Owner Available** | *default value* | The GitLab namespace where this repository will belong to. It can be the name of organization, group, subgroup, user, or the project |
| **Repository** |`demo-app` | The name for the git repository |

<center><img src={AppRepoInfoImg} width="70%" height="auto" /></center>

**4.** Review your inputs and select **Create**
<center><img src={CreateAppImg} width="70%" height="auto" /></center>


Your application will begin to deploy.

A **Task Activity** view will show you the progress of all of the actions executed to build out your application.  This includes gathering environment information, creating secrets, scaffolding a new repository, creating an access token for the repo, and registering the entity with backstage.  
