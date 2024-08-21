# Changelog

## 0.3.4 - 2024-08-23
* Upgraded OPA on AWS to the latest Backstage version and new backend system. 1.29.0
* New custom entity processor plugin - compatible with the new backend backstage system. <a href="docs/techdocs/plugins"> details here </a>
* Updated Gitlab version 17.2.2
* Support for Github and Multi-Git provider
* New template examples - including Terraform ECS cluster 
* New SecretsManager shared resource template
* New entity Schema updates - gitProvider, componentState, component spec subType  <a href="docs/techdocs/plugins"> details here </a>
* General package version updates
* Bug fix

## 0.3.3 - 2024-02-26

### New Features
* Amazon ECS using EC2 nodes sample added to reference template
* Add check for cdk bootstrap during environment provider provisioning to avoid manual pre-req
* GenAI runtime environment provider template
* GenAI RAG application template

### Bug Fixes
* Ensure Terraform state bucket name uniqueness
* Hard-coded region in EKS provider
* code hygiene

### Documentation
  * Security and Permissions updates
  * Kubernetes runtime and template docs
  * Contribution guidance
  * Architecture description and diagram improvements
  * General fixes to typos and clarifications
  * GenAI runtime and template docs

## 0.3.2 - 2024-01-29

### Fixed

* fixes reference repository pipelines to correct build issues
* fixes installation doc image referencing GitLab 16.8.1 in the AWS Marketplace

## 0.3.1 - 2024-01-24

### Fixed

* Backstage plugin version identifiers required for 0.3.0 release
* introduces a workaround for GitLab 16.8 error when creating new user
* introduces a workaround for an image build error due to upgraded "swagger-ui-react" module

## 0.3.0 - 2024-01-23

### New Features
* Support for Kubernetes: 
  * Add Amazon EKS provider
  * Import existing Amazon EKS clusters
  * Add Amazon EKS Application for K8s Kustomize pattern
  * Add Amazon EKS Application for K8s Helm pattern
  * Add CI/CD patterns for K8s applications
  * New UI Page for K8s with control panel to operate the application
* S3 Bucket as a shared resource
* Reuse existing VPC when creating providers(Import existing VPC)
* Amazon ECS provider with EC2 clusters for tailored workloads
* Updated Backstage platform to v1.21
* Support filter relevant environments for new apps

### New Documentation
* Security documentation
* Test cases
* Add a basic provider template - example for starting your own provider templates.
  
### Refactor
* Remove hyphenated names from entities
* Adding support for component subType for easy identification of internal AWS component classification

### Bug Fixes
* Delete provider - case name issue
* Delete app - case name issue
* Delete resource - remove secret deletion + adjusted stack name mapping
* Remove provider from an environment after creation


## 0.2.0 - 2023-09-26

### New Features

*  Environment and Environment provider entity types
*  Multi-account and multi-region support
*  Environment and Environment provider provisioning from Backstage
*  GitLab pipelines for CI/CD to build and deploy applications
*  Dynamic pipelines for new environment deployments
*  Environment addition at application level
*  Introduce environment hierarchy/level and require approval options for AWS Environment
*  Application auditing per environment
*  Environment selector drop down - Contextual environment switching for applications
*  Resource template for RDS
*  Resource Binding to applications
*  AWS-Resource Backstage Page
*  App Pending page - while pipeline is still provisioning the app/resource 
*  Java SpringBoot template
*  Delete App & Delete Provider capabilities
*  Serverless and ECS environment provider examples
*  Permissions framework adoption
*  Installation improvements

## 0.1.0 - 2023-04-10

### New Features

_initial release_

