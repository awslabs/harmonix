data "aws_availability_zones" "available" {}
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

#
# The VPC
#
resource "aws_vpc" "main" {
  cidr_block           = var.cidr_block
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = var.name
  }
}

#
# Default security group withg no rules 
#
resource "aws_default_security_group" "default" {
  vpc_id = aws_vpc.main.id
}