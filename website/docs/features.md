---
sidebar_position: 8
---

# Features

## Version 0.2

### 1. Platform engineer scope

| Feature |  Description |
| :- | :- |
| **Dynamic environment provider provisioning** |  Create unlimited number of providers on multiple accounts and regions |
| **ECS environment provider**  | Create an ECS (Elastic container servicer) based provider |
| **Serverless environment provider**  | Create a serverless based provider |
| **Abstracted AWS environment**  | Create a environment of which applications and resources can be created |
| **Application pipeline**  | Create a pipeline for each application to support IAC provisioning and code change stage |
| **Environment Deployment pipeline**  | Create a pipeline to deploy the code base of an application to another environment |
| **Resource Binding**  | Allow Binding resources to application to provide access and sharing capabilities for AWS resources |
| **Deploy to additional environments**  | Allow the deployment of an application to additional environments |
| **Environments selector**  | Toggle between the environments of which the application is deployed and present relevant information for the current selected environment |
| **Segregated auditing**  | Audit actions from platform and pipeline to a segregated auditing table of the target environment |
| **Environment level**  | Allow to define a number representing the level of the environment thus creates hierarchies that are used for deployments |
| **Deployment requires approval**  | Configure how the pipelines should execute against an environment automatic / require approval |
| **Delete app**  | Remove an application from an environment |
| **Delete provider**  | Remove a provider |
| **Centralized pipelines**  | Load pipelines dynamically from a centralized repository  |
| **Component Pending page**  | Present a partial page while the component IAC pipeline is still processing  |
| **Terraform/CDK pipelines**  | Support both terraform and CDK pipelines to provision resources  |


### 2. Application developer scope

| Feature |  Description |
| :- | :- |
| **Clone repository while resources are provisioned**  | The ability to clone the repository immediately after it was created without waiting for the pipeline to provision the infrastructure |
| **Start and stop ECS task**  | Start and stop the ECS task to load the latest container changes |
| **Change ECS task environment variable**  | Change the ECS Task definition environment variables to inject new parameters to the app runtime |
| **View related app cloud resources**  | View related application resources that are provisioned for this app |
| **View application logs**  | View the CloudWatch logs for the application |
| **Visualize application software catalog relationship**  | View the application relationship including environments, shared resources and owner|
| **Automatic deployment for additional environment**  | Deploy the application to another environment with a click of a button|
| **Delete app**  | Delete the application and it's related resources|
| **Bind application to resource**  | Permit an application to use a shared resource such as RDS database, S3 bucket, EFS etc.|
| **View application  CI/CD pipelines**  | View the application CI/CD pipelines|

## Coming up

| Feature | Scope  | Description | Timeline
| :- | :- | :- | :- |
| **EKS environment provider** | Platform Engineer | Create a Kubernetes based provider | Jan 2024 |
| **Environment Binding** | Platform Engineer | Bind Environments to allow network communication across multiple VPC's through AWS Transit gateway | February 2024 |


## Provided examples and templates
| Feature | Description | Type |
| :- | :- | :- |
| AWS ECS Environment Provider | a provider IAC for ECS runtime | Provider |
| AWS Serverless Environment Provider | a provider IAC for Serverless runtime | Provider |
| AWS RDS Database | an RDS database template | Resource |
| Node.js Terraform Web App | a node.js application provisioning by terraform | Application |
| Node.js Express Web App With RDS | a node.js application with a baked in starter code to connect to RDS database | Application |
| Node.js Express Web App | a node.js application | Application |
| Python Flask starter application | a python flask web server application | Application |
| Serverless REST API (TypeScript) | a lambda based serverless REST API application template for typescript | Application |
| Java Spring Boot Web Service | a java springboot application | Application |

## Backlog

| Feature | Scope  | Description |
| :- | :- | :- |