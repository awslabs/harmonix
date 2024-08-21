#
# Private subnet
#
resource "aws_subnet" "private_subnet" {
  count = length(var.private_subnets_cidr_blocks)

  vpc_id            = aws_vpc.main.id
  cidr_block        = element(var.private_subnets_cidr_blocks, count.index)
  availability_zone = element(data.aws_availability_zones.available.names, count.index)

  tags = {
    Name = "Private subnet ${count.index + 1}"
    subnet-type = "Private"
  }
}

#
# Private route table for each subnet as we are routing internet traffic 
# to a NAT in the same AZ as the subnet.
#
resource "aws_route_table" "private_rt" {
  count  = length(var.private_subnets_cidr_blocks)
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "Private Route Table ${count.index + 1}"
  }
}

#
# Route to the internet - different for each AZ/NAT gateway
#
resource "aws_route" "private_route_internet" {
  count                  = var.allow_internet_egress ? length(var.private_subnets_cidr_blocks) : 0
  route_table_id         = element(aws_route_table.private_rt.*.id, count.index)
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = element(aws_nat_gateway.nat.*.id, count.index)
}

#
# Association of route table with private subnet 
#
resource "aws_route_table_association" "private_route_table_association" {
  count          = length(var.private_subnets_cidr_blocks)
  subnet_id      = element(aws_subnet.private_subnet.*.id, count.index)
  route_table_id = element(aws_route_table.private_rt.*.id, count.index)
}

