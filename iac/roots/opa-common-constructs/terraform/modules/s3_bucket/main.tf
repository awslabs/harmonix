#
# Bucket resource
#
resource "aws_s3_bucket" "bucket" {
  #Skipping checkov checks
  #checkov:skip=CKV_AWS_144: no s3 cross region replication
  #checkov:skip=CKV2_AWS_61: "Ensure that an S3 bucket has a lifecycle configuration"
  bucket_prefix = var.name_prefix
  force_destroy = true
}

#
# Versioning configuration
#
resource "aws_s3_bucket_versioning" "versioning" {
  bucket = aws_s3_bucket.bucket.id
  versioning_configuration {
    status = "Enabled"
  }
}

#
# Access logs
#
resource "aws_s3_bucket_logging" "logging" {
  bucket        = aws_s3_bucket.bucket.id
  target_bucket = var.log_bucket != null ? var.log_bucket : aws_s3_bucket.bucket.id
  target_prefix = "log/"
}

#
# SSE configration
#
resource "aws_s3_bucket_server_side_encryption_configuration" "sse_conf" {
  #checkov:skip=CKV2_AWS_67: encryption key rotation not required for prototype.  Customer CMK expected to be used in production with rotation.
  bucket = aws_s3_bucket.bucket.bucket
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = var.kms_key_id
    }
  }
}

#
# Public access block
#
resource "aws_s3_bucket_public_access_block" "public_access" {
  bucket = aws_s3_bucket.bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

#
# Dummy access policy. We need it to allow the user of this module to provide 
# custom policy (valid use case for CloudFront, VPC logs etc) . 
# The policy below is pretty benign, denying access to the bucket over HTTP, 
# which would only happen in case of static website hosting on S3 (and we would 
# not support it anyway).
#
data "aws_iam_policy_document" "policy" {
  statement {
    sid     = "DenyNonHttpsTrafic"
    effect  = "Deny"
    actions = ["s3:*"]
    resources = [
      aws_s3_bucket.bucket.arn,
      "${aws_s3_bucket.bucket.arn}/*"
    ]
    principals {
      type        = "*"
      identifiers = ["*"]
    }
    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = [false]
    }
  }
}

#
# Attaching policy to the bucket
#
resource "aws_s3_bucket_policy" "bucket_policy" {
  bucket = aws_s3_bucket.bucket.bucket
  policy = coalesce(var.access_policy, data.aws_iam_policy_document.policy.json)
}

#
# Notification settings
#
resource "aws_s3_bucket_notification" "notification" {
  bucket      = aws_s3_bucket.bucket.bucket
  eventbridge = var.enable_eventbridge_notifications
}