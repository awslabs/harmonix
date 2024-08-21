# What is this module for?
This module creates following resources:
* Customer managed KMS key 
* Key access policy with decrypt/encrypt permissions for the set of given identities (unless policy is provided)
* Key alias

The default key policy is as follows:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "Admin Access",
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::012345678912:root"
            },
            "Action": "kms:*",
            "Resource": "*"
        },
        {
            "Sid": "2",
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:sts::012345678912:role/myrole"
            },
            "Action": [
                "kms:ReEncrypt*",
                "kms:GenerateDataKey*",
                "kms:Encrypt*",
                "kms:Describe*",
                "kms:Decrypt*"
            ],
            "Resource": "*"
        }
    ]
}
```

# How do I use it?
Simple useage:

```hcl
module kms {
  source = "../modules/kms"
  alias = "cmk/Test"
  description = "Test KMS key"
  roles = [aws_iam_role.example.arn]
}
```
# Inputs
|Variable name|Required|Description|
|-------------|--------|-----------|
|alias|Yes|Key alias to be created|
|description|Yes|Key's description|
|roles|No|List of IAM identities ARNs to be granted permissions to use the key for crypto operation. Required if no custom policy is provided.|
|services|No|List of services that will be granted access to the key|
|via_services|No|List of services which will allow all identities within current AWS account access to the key, as long as the key is used for encryption/decryption via one of the service in the list|
|key_policy|No|Custom key access policy. Needs to be provided if no roles are specified.|
# Outputs
|Output|Description|
|---|---|
|arn|ARN of the key provided|

# Ignored checkov warnings

**NOTE:** <br>
We have to ignore checkov warnings as we are using **aws_iam_policy_document** for a purpose it was not intended for.
Key policies have to follow guidelines as per https://docs.aws.amazon.com/kms/latest/developerguide/key-policies.html
This means that the resource we use needs to be "*" and we also give unlimited permissions to account's root to allow 
Administrators to manage the key.

|Warning|Description|Reason|
|---|---|---|
|CKV_AWS_111|Ensure IAM policies does not allow write access without constraints|False positive. Policy as per [documentation](https://docs.aws.amazon.com/kms/latest/developerguide/key-policies.html)|
|CKV_AWS_109|Ensure IAM policies does not allow permissions management / resource exposure without constraints|False positive. Policy as per [documentation](https://docs.aws.amazon.com/kms/latest/developerguide/key-policies.html)|

