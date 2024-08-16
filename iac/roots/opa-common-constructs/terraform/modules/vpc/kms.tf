#
# Encryption key for the VPC flow logs
#
module "key" {
  source      = "../kms"
  alias       = "vpc/logs/${aws_vpc.main.id}"
  description = "KMS Key to encrypt VPC CloudWatch Log group"
  services    = ["delivery.logs.amazonaws.com"]
}



