# Copyright 2024 Amazon.com and its affiliates; all rights reserved.
# This file is Amazon Web Services Content and may not be duplicated or distributed without permission.

# -------------------------------------------------------------------------
# REQUIRED PARAMETERS
# These parameters require values to be provided
# -------------------------------------------------------------------------

variable "ENV_NAME" {
  type        = string
  description = "The name of the OPA environment"
}

variable "AWS_ACCOUNT_ID" {
  type        = string
  description = "The 12-digit AWS account id where the ECS cluster will be created"
}

variable "PLATFORM_ROLE_ARN" {
  type        = string
  description = "The IAM role ARN to use"
}

variable "PIPELINE_ROLE_ARN" {
  type        = string
  description = "The IAM role ARN to use when running the CI/CD pipeline"
}

variable "PROVISIONING_ROLE_ARN" {
  type        = string
  description = "The IAM role ARN to use when provisioning the ECS cluster"
}

variable "PREFIX" {
  type        = string
  description = "A short prefix to use when naming AWS resources"
}

variable "VPC_ID" {
  type        = string
  description = "The AWS VPC identifier where the ECS cluster will be deployed into"
  default = null
}

# -------------------------------------------------------------------------
# OPTIONAL PARAMETERS
# These parameters have reasonable defaults.
# -------------------------------------------------------------------------
variable "AWS_DEFAULT_REGION" {
  type        = string
  description = "The AWS region where the ECS cluster will be created"
  default     = "us-east-1"
}

variable "ENV_CIDR" {
  type        = string
  description = "The CIDR block to allocate to the cluster"
  default     = "10.0.0.0/16"
}


