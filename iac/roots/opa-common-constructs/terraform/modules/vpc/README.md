# What is this module for?

This module creates following resources:

- VPC
- Public subnets
- Private subnets
- NAT gateway in each public subnet
- Private and public route tables
- Default security groups
- Optionally interface and/or gateway endpoints for AWS services

# How do I use it?

Public and private subnets with internet egress allowed from private subnets:

```hcl
module "vpc" {
  source                      = "../modules/vpc"
  name                        = "Main VPC"
  cidr_block                  = "10.0.0.0/16"
  public_subnets_cidr_blocks  = ["10.0.1.0/24", "10.0.3.0/24", "10.0.5.0/24"]
  private_subnets_cidr_blocks = ["10.0.2.0/24", "10.0.4.0/24", "10.0.6.0/24"]
}
```

Private subnets only, no internet egress:

```hcl
module "vpc" {
  source                      = "../modules/vpc"
  name                        = "Main VPC"
  cidr_block                  = "10.0.0.0/16"
  public_subnets_cidr_blocks  = []
  private_subnets_cidr_blocks = ["10.0.2.0/24", "10.0.4.0/24", "10.0.6.0/24"]
  interface_endpoint_services = ["ec2", "logs"]
  gateway_endpoint_services   = ["s3"]
  allow_internet_egress       = false
}
```

# Inputs

| Variable name | Required | Description |
| --------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name                        | Yes      | Name of the VPC |
| cidr_block                  | Yes      | CIDR block for the VPC                                                                                                                                            |
| public_subnets_cidr_blocks  | Yes      | List of CIDR blocks for the public subnets. Can be empty, if **allow_internet_egress** is set to false                                                            |
| private_subnets_cidr_blocks | Yes      | List of CIDR blocks for the private subnets                                                                                                                       |
| allow_internet_egress       | No       | Set to false to block internet egress from private subnets. If true (the default), the number of public subnets must be the same as the number of private subnets |
| interface_endpoint_services | No       | List of AWS services for which private interface endpoints should be created .e.g. ["ec2","kms"]                                                                  |
| gateway_endpoint_services   | No       | List of AWS services for which gateway endpoints should be created (only supported for s3 and dynamodb)                                                           |

# Outputs

| Output                 | Description                     |
| ---------------------- | ------------------------------- |
| vpc_id                 | ID of the VPC created           |
| vpc_private_subnet_ids | IDs of the private subnets      |
| vpc_public_subnet_ids  | IDs of the public subnets       |
| private_route_table_id | IDs of the private route tables |
| public_route_table_id  | IDs of the public route tables  |

# Ignored checkov warnings

|Warning|Description|Reason|
|---|---|---|
|CKV2_AWS_19|Ensure that all EIP addresses allocated to a VPC are attached to EC2 instances|Public IP addresses required for NAT gateways|