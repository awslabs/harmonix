#
# Internet gateway
#
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
}

#
# NA gateway AZ
# NOTE: It a requirement as per AWS Securiy Matrix have a NAT per AZ
#
resource "aws_eip" "nat_eip" {
  #checkov:skip=CKV2_AWS_19 "Ensure that all EIP addresses allocated to a VPC are attached to EC2 instances"
  count = length(var.public_subnets_cidr_blocks)
  domain   = "vpc"
  tags = {
    "Name" = "${var.name}/VPC/Public subnet ${count.index + 1}"
  }
}

resource "aws_nat_gateway" "nat" {
  count         = length(var.public_subnets_cidr_blocks)
  subnet_id     = element(aws_subnet.public_subnet.*.id, count.index)
  allocation_id = element(aws_eip.nat_eip.*.id, count.index)
}

