#
# Public subnets
#
resource "aws_subnet" "public_subnet" {
  count = length(var.public_subnets_cidr_blocks)

  vpc_id            = aws_vpc.main.id
  cidr_block        = element(var.public_subnets_cidr_blocks, count.index)
  availability_zone = element(data.aws_availability_zones.available.names, count.index)

  tags = {
    Name = "Public subnet ${count.index + 1}"
    subnet-type = "Public"
  }
}

#
# Single route table for all public subnets
#
resource "aws_route_table" "public_route_table" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "PublicRouteTable"
  }
}

#
# Route to the internet throguh IGW
#
resource "aws_route" "public_route_internet" {
  route_table_id         = aws_route_table.public_route_table.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.igw.id
}

#
# Association of the route table to all public subnets
#
resource "aws_route_table_association" "public_route_table_association" {
  count          = length(var.public_subnets_cidr_blocks)
  subnet_id      = element(aws_subnet.public_subnet.*.id, count.index)
  route_table_id = aws_route_table.public_route_table.id
}



