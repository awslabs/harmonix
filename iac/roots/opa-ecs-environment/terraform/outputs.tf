# Copyright 2024 Amazon.com and its affiliates; all rights reserved.
# This file is Amazon Web Services Content and may not be duplicated or distributed without permission.

# -------------------------------------------
# Outputs
# -------------------------------------------

# Environment Name
output "environment_name" {
  value       = local.envName
  description = "The Environment Provider name"
}

# Environment ID
output "environment_unique_id" {
  value       = random_string.unique_id.result
  description = "The Unique ID for the environment"
}

# SSM parameter name for VPC 
output "vpc_ssm_param_name" {
  value = aws_ssm_parameter.vpc_id_param.name
}

# SSM parameter name for ECS cluster 
output "ecs_cluster_param_name" {
  value = aws_ssm_parameter.ecs_cluster_param.name
}

# SSM parameter name for Audit table 
output "audit_table_param_name" {
  value = aws_ssm_parameter.audit_table_param.name
}

# SSM parameter name for Provisioning role name 
output "provisioning_role_param_name" {
  value = aws_ssm_parameter.opa_provisioning_role_name.name
}

# SSM parameter name for Provisioning role arn 
output "provisioning_role_arn_param_name" {
  value = aws_ssm_parameter.opa_provisioning_role_arn.name
}

# SSM parameter name for Operations role name 
output "operations_role_param_name" {
  value = aws_ssm_parameter.opa_operations_role_name.name
}

# SSM parameter name for Operations role arn 
output "operations_role_arn_param_name" {
  value = aws_ssm_parameter.opa_operations_role_arn.name
}
