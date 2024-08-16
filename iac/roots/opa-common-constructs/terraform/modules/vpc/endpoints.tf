#
# Default security group for the endpoints
#
resource "aws_security_group" "vpc_endpoints_security_group" {
  name_prefix = "vpc_endpoint_security_group_"
  description = "SG for VPC endpoints"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "Ingress for VPC CIDR"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.cidr_block]
  }
}

#
# Private interface endpoints for all services requested
#
resource "aws_vpc_endpoint" "interface_endpoints" {
  count               = length(var.interface_endpoint_services)
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.${var.interface_endpoint_services[count.index]}"
  vpc_endpoint_type   = "Interface"
  security_group_ids  = [aws_security_group.vpc_endpoints_security_group.id]
  subnet_ids          = aws_subnet.private_subnet.*.id
  private_dns_enabled = !var.allow_internet_egress
}

#
# Private gateway endpoints
#
resource "aws_vpc_endpoint" "gateway_endpoints" {
  count               = length(var.gateway_endpoint_services)
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.${var.gateway_endpoint_services[count.index]}"
  vpc_endpoint_type   = "Gateway"
  route_table_ids     = aws_route_table.private_rt.*.id
  private_dns_enabled = !var.allow_internet_egress
}

