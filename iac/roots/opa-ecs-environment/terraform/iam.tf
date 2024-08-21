# Copyright 2024 Amazon.com and its affiliates; all rights reserved.
# This file is Amazon Web Services Content and may not be duplicated or distributed without permission.

# ---------------------------------------------------------
# Create IAM roles for pipeline provisioning and operations
# ---------------------------------------------------------

data "aws_iam_policy_document" "provisioning_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "AWS"
      identifiers = [var.PIPELINE_ROLE_ARN]
    }
  }
}

data "aws_iam_policy_document" "operations_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "AWS"
      identifiers = [var.PLATFORM_ROLE_ARN]
    }
  }
}

# Allow secretsmanager actions
data "aws_iam_policy_document" "secretsmanager_access" {
  statement {
    sid = "SecretsManagerActions"
    actions = [
      "secretsmanager:CreateSecret",
      "secretsmanager:GetSecretValue",
      "secretsmanager:PutSecretValue",
      "secretsmanager:UpdateSecret",
      "secretsmanager:TagResource",
    ]
    effect    = "Allow"
    resources = ["arn:aws:secretsmanager:*:${data.aws_caller_identity.current.account_id}:secret:*"]
  }
}

# Allow S3 bucket creation and tagging
data "aws_iam_policy_document" "s3_bucket_access" {
  statement {
    sid       = "S3BucketAndTagging"
    actions   = ["s3:CreateBucket", "s3:PutBucketTagging"]
    effect    = "Allow"
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "aws:ResourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

# Allow action to get 'packaged.yaml' from S3 buckets
data "aws_iam_policy_document" "s3_packaged_yaml_access" {
  statement {
    sid       = "S3PackagedYaml"
    actions   = ["s3:GetObject", "s3:GetObjectAttributes"]
    effect    = "Allow"
    resources = ["arn:aws:s3:::*/packaged.yaml"]
    condition {
      test     = "StringEquals"
      variable = "aws:ResourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

# Allow Resource Group Read Permissions
data "aws_iam_policy_document" "resource_group_read_access" {
  statement {
    sid = "ResourceGroupReadAccess"
    actions = [
      "resource-groups:ListGroupResources",
    ]
    effect    = "Allow"
    resources = ["arn:aws:resource-groups:*:${data.aws_caller_identity.current.account_id}:group/*"]
  }

  # Allow getting tag resources
  statement {
    sid       = "ResourceGroupTagAccess"
    actions   = ["tag:GetResources"]
    effect    = "Allow"
    resources = ["*"]
  }
}

# Allow Resource Group Write/Modify Permissions
data "aws_iam_policy_document" "resource_group_write_access" {
  statement {
    sid = "ResourceGroupWriteAccess"
    actions = [
      "resource-groups:Tag",
      "resource-groups:DeleteGroup"
    ]
    effect    = "Allow"
    resources = ["arn:aws:resource-groups:*:${data.aws_caller_identity.current.account_id}:group/*"]
  }
  statement {
    sid       = "ResourceGroupCreation"
    actions   = ["resource-groups:CreateGroup"]
    effect    = "Allow"
    resources = ["*"] # CreateGroup does not support resource-level permissions and requires a wildcard
  }
}

# Allow decryption of the OPA encryption key
data "aws_iam_policy_document" "kms_decryption_access" {
  statement {
    sid       = "KmsOPAKeyDecryption"
    actions   = ["kms:Decrypt"]
    effect    = "Allow"
    resources = [module.encryption_key.arn]
  }
}

# Set access for vpc-related resources
data "aws_iam_policy_document" "vpc_access" {
  statement {
    sid       = "VpcAccess"
    actions   = ["ec2:*"]
    effect    = "Allow"
    resources = ["arn:aws:ec2:*:${data.aws_caller_identity.current.account_id}:vpc/${local.cluster_vpc_id}"]
  }
}

# Allow access to ecs cluster
data "aws_iam_policy_document" "ecs_access" {
  #checkov:skip=CKV_AWS_111: "Policy allows '*' resources to address cluster restrictions documented at https://docs.aws.amazon.com/AmazonECS/latest/userguide/security_iam_id-based-policy-examples.html.  A condition statement is used to scope access."
  #checkov:skip=CKV_AWS_356: "Policy allows '*' resources to address cluster restrictions documented at https://docs.aws.amazon.com/AmazonECS/latest/userguide/security_iam_id-based-policy-examples.html.  A condition statement is used to scope access."
  statement {
    sid       = "EcsClusterAccess"
    actions   = ["ecs:*"]
    effect    = "Allow"
    resources = ["*"] # Fix for ecs cluster restriction doc https://docs.aws.amazon.com/AmazonECS/latest/userguide/security_iam_id-based-policy-examples.html
    condition {
      test     = "ArnEquals"
      variable = "ecs:cluster"
      values   = [aws_ecs_cluster.ecs_environment.arn]
    }
  }

  # Allow access to ECS task definitions
  statement {
    sid       = "EcsTaskDefAccess"
    actions   = ["ecs:DescribeTaskDefinition", "ecs:RegisterTaskDefinition"]
    effect    = "Allow"
    resources = ["*"] # Fix for ecs cluster restriction doc https://docs.aws.amazon.com/AmazonECS/latest/userguide/security_iam_id-based-policy-examples.html
  }
}

# Allow write access to the DynamoDB audit table
data "aws_iam_policy_document" "audit_table_access" {
  statement {
    sid = "AuditTableAccess"
    actions = [
      "dynamodb:Put*",
      "dynamodb:Update*",
      "dynamodb:List*",
      "dynamodb:DescribeStream",
      "dynamodb:DescribeTable",
      "dynamodb:CreateTable",
    ]
    effect    = "Allow"
    resources = [module.audit_table.arn]
  }
}

# Allow passing IAM roles
data "aws_iam_policy_document" "pass_iam_role" {
  statement {
    sid       = "PassIamRole"
    actions   = ["iam:PassRole"]
    effect    = "Allow"
    resources = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/*"]
    condition {
      test     = "StringEquals"
      variable = "iam:PassedToService"
      values   = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# Allow scan and putitem access to DynamoDB tables 
data "aws_iam_policy_document" "dynamodb_table_access" {
  statement {
    sid = "DynamoDBAccess"
    actions = [
      "dynamodb:Scan",
      "dynamodb:PutItem",
    ]
    effect    = "Allow"
    resources = ["arn:aws:dynamodb:*:${data.aws_caller_identity.current.account_id}:table/*"]
  }
}

# Create the pipeline provisioning inline policy by combining other policies
data "aws_iam_policy_document" "provisioning_role_inline" {
  source_policy_documents = [
    data.aws_iam_policy_document.secretsmanager_access.json,
    data.aws_iam_policy_document.s3_bucket_access.json,
    data.aws_iam_policy_document.s3_packaged_yaml_access.json,
    data.aws_iam_policy_document.resource_group_read_access.json,
    data.aws_iam_policy_document.resource_group_write_access.json,
    data.aws_iam_policy_document.kms_decryption_access.json,
    data.aws_iam_policy_document.vpc_access.json,
    data.aws_iam_policy_document.ecs_access.json,
    data.aws_iam_policy_document.audit_table_access.json,
  ]
}

# Create the operations inline policy by combining other policies
data "aws_iam_policy_document" "operations_role_inline" {
  source_policy_documents = [
    data.aws_iam_policy_document.secretsmanager_access.json,
    data.aws_iam_policy_document.s3_packaged_yaml_access.json,
    data.aws_iam_policy_document.resource_group_read_access.json,
    data.aws_iam_policy_document.dynamodb_table_access.json,
    data.aws_iam_policy_document.kms_decryption_access.json,
    data.aws_iam_policy_document.vpc_access.json,
    data.aws_iam_policy_document.ecs_access.json,
    data.aws_iam_policy_document.pass_iam_role.json,
  ]
  # Custom audit table permission
  statement {
    sid = "AuditTableOperationsAccess"
    actions = [
      "dynamodb:DescribeStream",
      "dynamodb:DescribeTable",
      "dynamodb:List*",
      "dynamodb:Put*"
    ]
    resources = [module.audit_table.arn]
    effect    = "Allow"
  }
}

# Create the pipeline provisioning role
resource "aws_iam_role" "opa_provisioning" {
  #checkov:skip=CKV2_AWS_56: IAM access used for prototype; however, as noted below, production scenarios should scope this policy down to specific permissions for expected template usage.
  description        = "IAM role to be assumed when provisioning resources in OPA for: ${local.envName} environment"
  name               = "${local.prefix}-${local.envName}-provisioning-role"
  assume_role_policy = data.aws_iam_policy_document.provisioning_assume_role.json
  managed_policy_arns = [
    "arn:aws:iam::aws:policy/PowerUserAccess",
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess",
    "arn:aws:iam::aws:policy/CloudWatchFullAccess",
    "arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess",
    # Add managed role policies to support SAM template deployment for non-root roles
    # 
    # In a production scenario, a customized IAM policy granting specific permissions should be created.
    # See https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-permissions-cloudformation.html
    # 
    "arn:aws:iam::aws:policy/AWSCloudFormationFullAccess",
    "arn:aws:iam::aws:policy/IAMFullAccess",
    "arn:aws:iam::aws:policy/AmazonS3FullAccess",
  ]
  inline_policy {
    name   = "opa_provisioning_inline_policy"
    policy = data.aws_iam_policy_document.provisioning_role_inline.json
  }
  max_session_duration = 43200 # 12 hours
}

# Create the ECS operations role
resource "aws_iam_role" "opa_operations" {
  description        = "IAM role to be assumed when performing operations in OPA for: ${local.envName} environment"
  name               = "${local.prefix}-${local.envName}-operations-role"
  assume_role_policy = data.aws_iam_policy_document.operations_assume_role.json
  managed_policy_arns = [
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess",
    "arn:aws:iam::aws:policy/CloudWatchFullAccess",
    "arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess",
    "arn:aws:iam::aws:policy/AWSCloudFormationFullAccess" # Required to remove stacks of Apps - delete App
  ]
  inline_policy {
    name   = "opa_operations_inline_policy"
    policy = data.aws_iam_policy_document.operations_role_inline.json
  }
  max_session_duration = 43200 # 12 hours
}



# ---------------------------------------
# Save role information in SSM Parameters
# ---------------------------------------
# Save the provisioning role name and arn
resource "aws_ssm_parameter" "opa_provisioning_role_name" {
  #checkov:skip=CKV2_AWS_34: Provisioning role name is not a sensitive string for a prototype and does not need encryption
  #checkov:skip=CKV_AWS_337: Provisioning role name is not a sensitive string and does not need to use a KMS key for encryption
  description = "The Provisioning Role name for OPA Solution: ${local.envName} Environment"
  name        = "/${local.prefix}/${local.envName}/provisioning-role"
  type        = "String"
  value       = aws_iam_role.opa_provisioning.name
}
resource "aws_ssm_parameter" "opa_provisioning_role_arn" {
  #checkov:skip=CKV2_AWS_34: Provisioning role arn is not a sensitive string for a prototype and does not need encryption
  #checkov:skip=CKV_AWS_337: Provisioning role arn is not a sensitive string and does not need to use a KMS key for encryption
  description = "The Provisioning Role Arn for OPA Solution: ${local.envName} Environment"
  name        = "/${local.prefix}/${local.envName}/provisioning-role-arn"
  type        = "String"
  value       = aws_iam_role.opa_provisioning.arn
}
# Save the operations role name and arn
resource "aws_ssm_parameter" "opa_operations_role_name" {
  #checkov:skip=CKV2_AWS_34: Operations role name is not a sensitive string for a prototype and does not need encryption
  #checkov:skip=CKV_AWS_337: Operations role name is not a sensitive string and does not need to use a KMS key for encryption
  description = "The Operations Role name for OPA Solution: ${local.envName} Environment"
  name        = "/${local.prefix}/${local.envName}/operations-role"
  type        = "String"
  value       = aws_iam_role.opa_operations.name
}
resource "aws_ssm_parameter" "opa_operations_role_arn" {
  #checkov:skip=CKV2_AWS_34: Operations role arn is not a sensitive string for a prototype and does not need encryption
  #checkov:skip=CKV_AWS_337: Operations role arn is not a sensitive string and does not need to use a KMS key for encryption
  description = "The operations Role Arn for OPA Solution: ${local.envName} Environment"
  name        = "/${local.prefix}/${local.envName}/operations-role-arn"
  type        = "String"
  value       = aws_iam_role.opa_operations.arn
}
