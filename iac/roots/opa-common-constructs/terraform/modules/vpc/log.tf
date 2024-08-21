#
# Bucket for the flow logs
#
module "log_bucket" {
  source        = "../s3_bucket"
  name_prefix   = "vpc-flow-logs-"
  kms_key_id    = module.key.arn
  access_policy = data.aws_iam_policy_document.policy.json
}

#
# Bucket policy allowing logs to be written to the bucket
#
data "aws_iam_policy_document" "policy" {
  statement {
    sid       = "AllowLogDelivery"
    effect    = "Allow"
    actions   = ["s3:Putobject"]
    resources = ["${module.log_bucket.arn}/*"]
    principals {
      type        = "Service"
      identifiers = ["delivery.logs.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
    condition {
      test     = "StringEquals"
      variable = "s3:x-amz-acl"
      values   = ["bucket-owner-full-control"]
    }
    condition {
      test     = "ArnLike"
      variable = "aws:SourceArn"
      values   = ["arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*"]
    }
  }

  statement {
    sid       = "AWSLogDeliveryAclCheck"
    effect    = "Allow"
    actions   = ["s3:GetBucketAcl"]
    resources = [module.log_bucket.arn]
    principals {
      type        = "Service"
      identifiers = ["delivery.logs.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
    condition {
      test     = "ArnLike"
      variable = "aws:SourceArn"
      values   = ["arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*"]
    }
  }
}

#
# VPC flow logs
#
resource "aws_flow_log" "log" {
  log_destination      = module.log_bucket.arn
  log_destination_type = "s3"
  traffic_type         = "ALL"
  vpc_id               = aws_vpc.main.id
  destination_options {
    file_format        = "parquet"
    per_hour_partition = true
  }
}
