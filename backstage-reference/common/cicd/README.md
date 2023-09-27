# Reusable CICD Configurations

## Job defaults
1. `.gitlab-ci-job-defaults-cdk.yml`
   1. Baseline CDK, Git, Yarn, Node and Python
   2. Clone of backstage reference CICD directory and scripts
2. `.gitlab-ci-job-defaults-tf.yml`
   1. Baseline of Terraform , Node and Python
   2. Clone of backstage reference CICD directory and scripts

## Base jobs
  * default job settings and tool installations
  * job to create CICD stages for an environment
  
1. `.gitlab-ci-aws-base.yml`
   1. Get create environment CI
   2. Resource Binding/unbinding
2. `.gitlab-ci-aws-tf-base.yml`
   1. Terraform destroy job

## Stack specific jobs
1. `.gitlab-ci-aws-iac-ecs.yml`
  * IaC/CDK deployment for ECS apps
2. `.gitlab-ci-aws-iac-rds.yml`
  * IaC/CDK deployment for RDS resources
3. `.gitlab-ci-aws-dind-spring-boot.yml`
  * docker-in-docker container image build steps for java/maven/springboot apps

## Tech Specific jobs
1. `.gitlab-ci-aws-image-kaniko.yml`
  * container image build steps that utilize kaniko