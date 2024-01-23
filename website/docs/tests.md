---
sidebar_position: 10
---

# Test Cases

The described test cases below provider a starting point to map the different features and capabilities that needs to be tested when changes occurs. 

------

*This is not intended to be a final or complete list but a starting point to reason about the different use cases and how to test them*

## Assumptions

1. You have OPA on AWS platform deployed and running.
2. You have several accounts that are used or can be used to provision environments and applications.
3. You have an identity provider configured with backstage(Okta, AD, etc.)

## Test case, context and expected result
We define a context of a test with the letter **"C"**. This will allow us to describe the existing state before we can execute a test case.

We also define test case with the letter **"T"** which describe the set of instructions to test a scenario on OPA on AWS.

Lastly we define the expected result with the letter **"E"**, this will describe the expected assertion of a resulted test case.

## Context
| ID |  Description |
| :- | :- |
| C01 |  An entitled user logged-in to backstage |
| C02 |  A provisioned ECS Environment(Single provider) is available |
| C03 |  A provisioned EKS Environment(Single provider) is available |
| C04 |  A provisioned Serverless Environment(Single provider) is available |
| C05 |  A provisioned AWS Environment is available |
| C06 |  A provisioned ECS application(Single environment) is available |
| C07 |  A provisioned EKS application(Single environment) is available |
| C08 |  A provisioned Serverless application(Single environment) is available |
| C09 |  A provisioned shared RDS Resource is available |
| C10 |  A provisioned shared S3 Resource is available |
| C11 |  A binding between an application and resource exist |
| C12 |  An application is deployed to more than one environment |
| C13 |  A provisioned ECS Environment(Multi provider) is available |
| C14 |  A provisioned EKS Environment(Multi provider)  is available |
| C15 |  A provisioned Serverless Environment(Multi provider)  is available |
| C16 |  A provisioned ECS application(Multi environment)  is available |
| C17 |  A provisioned EKS application(Multi environment) is available |
| C18 |  A provisioned Serverless application(Multi environment) is available |
| C19 |  A provisioned Terraform application/provider/resource |
| C20 |  User chooses that a new VPC should be created |
| C21 |  User chooses that an existing VPC ID should be used instead of creating a new VPC |
| C22 |  A provisioned EKS Cluster is available |
| C23 |  A provisioned EKS Cluster Kubectl Lambda is available |

## Expected result
| ID |  Description |
| :- | :- |
| E01 | Successfully provision an ECS provider |
| E02 | Successfully provision an EKS provider |
| E03 | Successfully provision an Serverless provider |
| E04 | Successfully provision an Environment |
| E05 | Successfully provision an ECS application(Single provider) |
| E06 | Successfully provision an EKS application(Single provider) |
| E07 | Successfully provision a Serverless application(Single provider) |
| E08 | Successfully start and stop an application |
| E09 | Successfully view application logs |
| E10 | Successfully view application audit table |
| E11 | Successfully set environment variables to an application |
| E12 | Successfully view cloud related application resources |
| E13 | Successfully bind a shared resource to an application |
| E14 | Successfully deploy an application to additional environments |
| E15 | Successfully toggle between deployed environments of an application |
| E16 | Successfully delete an application from an environment |
| E17 | Successfully delete an application from all environments |
| E18 | Successfully delete a shared resource |
| E19 | Successfully delete a provider |
| E20 | Successfully delete an environment |
| E21 | Successfully view provider details |
| E22 | Successfully unbind a shared resource to an application |
| E23 | A new VPC is created for the provider |
| E24 | An existing VPC ID is used by the provider |
| E25 | Successfully provision an RDS database as a shared resource |
| E26 | Successfully provision an S3 bucket as a shared resource |
| E27 | Successfully create EKS provider using existing EKS cluster and create new kubectl lambda |
| E28 | Successfully create EKS provider using existing EKS cluster and existing kubectl lambda |

## Test cases

### Platform engineering

#### Environment Providers

| ID | Context | Description | Expected Result
| :- | :- | :- | :- |
| T001 | C01+C20 | Provision an ECS environment provider with serverless compute (Fargate) | E01+E23|
| T002 | C01+C21 | Provision an ECS environment provider with serverless compute (Fargate) | E01+E24|
| T003 | C01+C20 | Provision an ECS environment provider with EC2 compute | E01+E23|
| T004 | C01+C20 | Provision an EKS environment provider with serverless compute (Fargate) | E02+E23|
| T005 | C01+C21 | Provision an EKS environment provider with serverless compute (Fargate) | E02+E24|
| T006 | C01 | Provision an EKS environment provider with managed nodes | E02|
| T007 | C01 | Provision an EKS environment provider with private-only API access | E02|
| T008 | C01+C20 | Provision a Serverless environment provider | E03+E23|
| T009 | C01+C21 | Provision a Serverless environment provider | E03+E24|
| T010 | C01+(C02,C03,C04) | View provider information card - on provider page | E21|
| T011 | C01+(C02,C03,C04) | Delete provider - on provider management page | E19|
| T012 | C01+C22 | Provision an EKS environment provider and import an existing cluster and create kubectl lambda | E27|
| T013 | C01+C22+C23 | Provision an EKS environment provider and import an existing cluster and reuse existing kubectl lambda | E28|

#### Environments

| ID | Context | Description | Expected Result
| :- | :- | :- | :- |
| T200 | C01 | Provision an AWS environment with a single provider | E04|
| T201 | C01+C05 | View environment information card - on environment page | E21|
| T202 | C01+C05 | Delete environment - on environment management page | E21| 
| T203 | C01+C05 | Add additional provider to an existing environment - on environment page | E19 | 
| T204 | C01+C05 | Delete a provider from an existing environment - on environment page | E19 |

### Developer

#### Application Provisioning

| ID | Context | Description | Expected Result
| :- | :- | :- | :- |
| T400 | C01 + C02 | Provision a node.js application on AWS ECS environment with a single provider | E05|
| T401 | C01 + C02 | Provision a Java SpringBoot application on AWS ECS environment with a single provider | E05|
| T402 | C01 + C02 | Provision a python application on AWS ECS environment with a single provider | E05|
| T403 | C01 + C02 | Provision a node.js Terraform application on AWS ECS environment with a single provider | E05|
| T404 | C01 + C03 | Provision a node.js application on AWS EKS environment with a single provider | E06|
| T405 | C01 + C03 | Provision a Java SpringBoot application on AWS EKS environment with a single provider | E06|
| T406 | C01 + C03 | Provision a python application on AWS EKS environment with a single provider | E06|
| T407 | C01 + C03 | Provision a node.js Terraform application on AWS EKS environment with a single provider | E06|
| T408 | C01 + C04 | Provision a Serverless REST API application on AWS Serverless environment with a single provider | E07|

#### Application operations
| ID | Context | Description | Expected Result
| :- | :- | :- | :- |
| T600 | C06 | Start and Stop the application | E08|
| T601 | C06 | View application cloudwatch logs - on App logs tab | E09|
| T602 | C06 | View application audit table - on audit tab | E10|
| T603 | C06 | Add/edit/delete environment variables for the application | E11|
| T604 | C06 | View related cloud resources for the application | E12|
| T605 | C06 + C02 | Deploy application to another available environment | E14|
| T606 | C06 + C12 | Toggle between deployed environments for the application | E15|
| T607 | C06 | Delete an application from an environment | E16|
| T608 | C06 + C12 | Delete an application from all environments | E17|
| T609 | C06 + C09 | Bind a shared resource RDS to an application | E13|
| T610 | C06 + C09 + C11 | Unbind a shared resource from an application | E22|
| T611 | C07 | Start and Stop the application | E08|
| T612 | C07 | View application cloudwatch logs - on App logs tab | E09|
| T613 | C07 | View application audit table - on audit tab | E10|
| T614 | C07 | Add/edit/delete environment variables for the application | E11|
| T615 | C07 | View related cloud resources for the application | E12|
| T616 | C07 + C02 | Deploy application to another available environment | E14|
| T617 | C07 + C12 | Toggle between deployed environments for the application | E15|
| T618 | C07 | Delete an application from an environment | E16|
| T619 | C07 + C12 | Delete an application from all environments | E17|
| T620 | C07 + C09 | Bind a shared resource RDS to an application | E13|
| T621 | C07 + C09 + C11 | Unbind a shared resource from an application | E22|

### Shared resources
| ID | Context | Description | Expected Result
| :- | :- | :- | :- |
| T900 | C01+(C02,C03,C04) | Create a new RDS database resource | E25|
| T901 | C01+(C02,C03,C04) | Create a new S3 bucket resource | E26|
