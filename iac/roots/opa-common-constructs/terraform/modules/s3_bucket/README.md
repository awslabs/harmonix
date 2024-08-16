# What is this module for
Creates S3 bucket with versioning, logging & encryption.

# How do I use it?
Simple useage:

```hcl
module mybucket { 
   source = "../modules/s3_bucket" 
   name_prefix = "my_bucket_" 
}
```

# Inputs
|Variable name|Required|Description|
|-------------|--------|-----------|
|name_prefix|Yes|Prefix of the S3 bucket name. TF will automaticaly generate bucket name using this prefix. **NOTE:** S3 bucket names do not accept uppercase characters in their names!|
|log_bucket|No|Name of the bucket where access logs are to be stored. If not specified, the bucket will store the logs with the /log prefix in itself.|
|access_policy|No|JSON document of the bucket access policy|
|kms_key_id|No|Id of the KMS key to use for encryption|
|enable_eventbridge_notifications|No|Set to true to enable events being sent from this bucket to EventBridge. Defaults to false.|

# Outputs
|Output|Description|
|---|---|
|name|Generated name of the bucket|
|arn|ARN of the bucket created|
|id|Id of the bucket|
|regional_domain_name|The bucket region-specific domain name. Used for creating Cloudfront S3 origins|

# Ignored checkov warnings

|Warning|Description|Reason|
|---|---|---|
|CKV_AWS_144|Ensure that S3 bucket has cross-region replication enabled|Redundant to requirements
|CKV2_AWS_61|Ensure that an S3 bucket has a lifecycle configuration|Surplus to PoC requirement|