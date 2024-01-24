### 0.3.0 (2024-01-23)

##### New Features
* Support for Kubernetes: 
  * Add AWS EKS provider
  * Import existing AWS EKS clusters
  * Add AWS EKS Application for K8s Kustomize pattern
  * Add AWS EKS Application for K8s Helm pattern
  * Add CI/CD patterns for K8s applications
  * New UI Page for K8s with control panel to operate the application
* S3 Bucket as a shared resource
* Reuse existing VPC when creating providers(Import existing VPC)
* AWS ECS provider with EC2 clusters for tailored workloads
* Updated Backstage platform to v1.21
* Support filter relevant environments for new apps

##### New Documentation
  * Security documentation
  * Test cases
  * Add a basic provider template - example for starting your own provider templates.
  
##### Refactor
  * Remove hyphenated names from entities
  * Adding support for component subType for easy identification of internal AWS component classification

##### Bug Fixes
  * Delete provider - case name issue
  * Delete app - case name issue
  * Delete resource - remove secret deletion + adjusted stack name mapping
  * Remove provider from an environment after creation


### 0.2.0 (2023-09-26)

##### New Features

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

#### 0.1.0 (2023-04-10)

##### New Features

* initial release
