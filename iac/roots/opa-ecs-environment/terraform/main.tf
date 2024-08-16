# Copyright 2024 Amazon.com and its affiliates; all rights reserved.
# This file is Amazon Web Services Content and may not be duplicated or distributed without permission.

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# -------------------------------------------------------------------
# Create and save a Unique environment identifier as an SSM parameter
# -------------------------------------------------------------------

# Create a unique identifier for use with naming resources
resource "random_string" "unique_id" {
  length  = 4
  special = false
}
resource "aws_ssm_parameter" "env_identifier_param" {
  #checkov:skip=CKV2_AWS_34: Environment identifier is not a sensitive string for a prototype and does not need encryption
  #checkov:skip=CKV_AWS_337: Environment identifier is not a sensitive string and does not need to use a KMS key for encryption
  description     = "The unique identifier for the ${local.envName} Environment"
  name            = "${local.envPathIdentifier}/unique-id"
  type            = "String"
  value           = random_string.unique_id.result
  allowed_pattern = ".*"
}

# ----------------------------------------
# Create encryption key for all data at rest encryption
# ----------------------------------------
module "encryption_key" {
  source              = "./modules/kms"
  description         = "OPA KMS key for encryption of data at rest"
  alias               = "${local.envPathIdentifier}-key"
  enable_key_rotation = true
  pending_window      = 8
}

# Save the KMS key arn in an SSM Parameter
resource "aws_ssm_parameter" "kms_key_param" {
  #checkov:skip=CKV2_AWS_34: KMS key name is not a sensitive string for a prototype and does not need encryption
  #checkov:skip=CKV_AWS_337: KMS key name is not a sensitive string and does not need to use a KMS key for encryption
  description     = "The KMS key for ECS Solution: ${local.envName} Environment"
  name            = "${local.envPathIdentifier}/kms-key"
  type            = "String"
  allowed_pattern = ".*"
  value           = module.encryption_key.arn
}

# ----------------------------------------
# Create VPC resources for the ECS Cluster
# ----------------------------------------

# use default subnet blocks.  This could be exposed as variables in production
locals {
  vpc_public_subnet_blocks  = ["10.0.0.0/27", "10.0.0.32/27", "10.0.0.64/27"]
  vpc_private_subnet_blocks = ["10.0.0.96/27", "10.0.0.128/27", "10.0.0.160/27"]
}

# Create a new VPC for the ECS Cluster if a VPC_ID is not provided
module "app_runtime_vpc" {
  count = var.VPC_ID == null ? 1 : 0
  source                      = "./modules/vpc"
  name                        = local.envName
  cidr_block                  = local.cidrInput
  public_subnets_cidr_blocks  = local.vpc_public_subnet_blocks
  private_subnets_cidr_blocks = local.vpc_private_subnet_blocks
  interface_endpoint_services = ["rds", "elasticloadbalancing", "elasticloadbalancing", "lambda", "logs", "monitoring", "execute-api", "sns", "sqs", "kms", "ecr.api", "ecr.dkr"]
  gateway_endpoint_services   = ["s3", "dynamodb"]
}

# Lookup and use the existing VPC and subnets if a VPC_ID is provided
data "aws_vpc" "existing_vpc" {
  count = var.VPC_ID != null ? 1 : 0
  id = var.VPC_ID
}
data "aws_subnets" "vpc_public_subnets" {
  count = var.VPC_ID != null ? 1 : 0
  filter {
    name   = "vpc-id"
    values = [var.VPC_ID]
  }
  tags = {
    Name = "*public*"
  }
}
data "aws_subnets" "vpc_private_subnets" {
  count = var.VPC_ID != null ? 1 : 0
  filter {
    name   = "vpc-id"
    values = [var.VPC_ID]
  }
  tags = {
    Name = "*private*"
  }
}

# Save local references for VPC and subnet ids regardless whether they are imported data or Terraform managed
# `concat` is used to merge two lists where one or the other is guaranteed to be empty (based on presence of var.VPC_ID above)
locals {
  cluster_vpc_id     = concat(module.app_runtime_vpc[*].vpc_id, data.aws_vpc.existing_vpc[*].id)[0]
  public_subnet_ids  = concat(module.app_runtime_vpc[*].vpc_public_subnet_ids, data.aws_subnets.vpc_public_subnets[*].ids)[0]
  private_subnet_ids = concat(module.app_runtime_vpc[*].vpc_private_subnet_ids, data.aws_subnets.vpc_private_subnets[*].ids)[0]
}

# Save the VPC public subnets in an SSM Parameter
resource "aws_ssm_parameter" "vpc_public_subnet_param" {
  #checkov:skip=CKV2_AWS_34: VPC subnet ids are not sensitive strings for a prototype and do not need encryption
  #checkov:skip=CKV_AWS_337: VPC subnet ids are not sensitive strings for a prototype and do not need to use a KMS key for encryption
  count       = length(local.vpc_public_subnet_blocks) == 0 ? 0 : 1
  description = "The public subnets for the ${local.envName} VPC"
  name        = "${local.envPathIdentifier}/vpc/public-subnets"
  type        = "StringList"
  value       = join(",", local.public_subnet_ids)
}

# Save the VPC private subnets in an SSM Parameter
resource "aws_ssm_parameter" "vpc_private_subnet_param" {
  #checkov:skip=CKV2_AWS_34: VPC subnet ids are not sensitive strings for a prototype and do not need encryption
  #checkov:skip=CKV_AWS_337: VPC subnet ids are not sensitive strings for a prototype and do not need to use a KMS key for encryption
  count       = length(local.vpc_private_subnet_blocks) == 0 ? 0 : 1
  description = "The public subnets for the ${local.envName} VPC"
  name        = "${local.envPathIdentifier}/vpc/private-subnets"
  type        = "StringList"
  value       = join(",", local.private_subnet_ids)
}

# Save the VPC id in an SSM Parameter
resource "aws_ssm_parameter" "vpc_id_param" {
  #checkov:skip=CKV2_AWS_34: VPC id is not a sensitive string for a prototype and does not need encryption
  #checkov:skip=CKV_AWS_337: VPC id is not a sensitive string and does not need to use a KMS key for encryption
  description = "The VPC id for the ${local.envName} Environment"
  name        = "${local.envPathIdentifier}/vpc"
  type        = "String"
  value       = local.cluster_vpc_id
}

# ----------------------
# Create the ECS Cluster
# ----------------------
resource "aws_ecs_cluster" "ecs_environment" {
  name = "${local.envName}-cluster"
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}
resource "aws_ecs_cluster_capacity_providers" "fargate" {
  cluster_name       = aws_ecs_cluster.ecs_environment.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]
  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
  }
}
# Save the ECS cluster ARN in an SSM Parameter
resource "aws_ssm_parameter" "ecs_cluster_param" {
  #checkov:skip=CKV2_AWS_34: ECS Cluster name is not a sensitive string for a prototype and does not need encryption
  #checkov:skip=CKV_AWS_337: ECS Cluster name is not a sensitive string and does not need a KMS key for encryption
  description = "The ECS cluster for OPA Solution: ${local.envName} Environment"
  name        = "${local.envPathIdentifier}/ecs-cluster"
  type        = "String"
  value       = aws_ecs_cluster.ecs_environment.arn
}

# ---------------------------------
# Create an audit table in DynamoDB
# ---------------------------------
locals {
  auditTableName = "${local.envName}-audit"
}
module "audit_table" {
  source                   = "./modules/dynamodb"
  table_name               = local.auditTableName
  hash_key                 = "id"
  range_key                = "createdAt"
  attributes               = [{ name = "currentDate", type = "S" }]
  global_secondary_indices = [{ name = "currentDateIdx", hash_key = "currentDate", range_key = null }]
  encryption_key_arn       = module.encryption_key.arn
}
# Save the table name in an SSM Parameter
resource "aws_ssm_parameter" "audit_table_param" {
  #checkov:skip=CKV2_AWS_34: Audit table name is not a sensitive string and does not need encryption
  #checkov:skip=CKV_AWS_337: Audit table name is not a sensitive string and does not need a KMS key for encryption
  description     = "The DynamoDB Table ${local.auditTableName} for OPA Solution: ${local.envName} Environment"
  name            = "${local.envPathIdentifier}/${local.auditTableName}"
  type            = "String"
  value           = local.auditTableName
  allowed_pattern = ".*"
}
