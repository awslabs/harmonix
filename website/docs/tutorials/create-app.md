---
sidebar_position: 2
---

# Create Apps

**1.** On the OPA on AWS website, navigate to the **Create...** menu. Search and choose **Node.js Microservice**. 
![alt text](/img/docs/choose-app.png)


**2.** Provide application information and select **Next Step** 

| Parameter | Value  | Description |
| :- | :- | :- |
| **Name** |```banking-app``` | A unique identifier for the application |
| **Description** |```Node.js banking application running on ECS``` | Describes what the appplications's purpose will be |
| **Owner** | Select 'developer' | The group or user that will be responsible for the entity |
| **AWS Environment** | *the **dev-environment** will be pre-selected since it is the only environment available* | The AWS Environment in which you want to deploy your application to. The environment that we created in the previous step will already be selected for you |
![alt text](/img/docs/app-component-info.png)


**3.** Provide Repository information and select **Next Step**

| Parameter | Value  | Description |
| :- | :- | :- |
| **Host** | *default value* | The GitLab host name |
| **Owner Available** | *default value* | The GitLab namespace where this repository will belong to. It can be the name of organization, group, subgroup, user, or the project |
| **Repository** |```banking-app-repo``` | The name for the git repository |

![alt text](/img/docs/app-repo-info.png)


**4.** Review your inputs and select **Create**
![alt text](/img/docs/create-app.png)


Your Application will begin to deploy! 

A **Task Activity** view will show you the progress of all of the actions executed to build out your application.  This includes gathering environment information, creating secrets, scaffolding a new repository, creating an access token for the repo, and registering the entity with backstage.  
