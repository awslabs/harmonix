output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_arn" {
  description = "ARN of the VPC"
  value       = aws_vpc.main.arn
}

output "vpc_private_subnet_ids" {
  description = "IDs of the private Subnets"
  value       = aws_subnet.private_subnet[*].id
}

output "vpc_public_subnet_ids" {
  description = "IDs of the public Subnets"
  value       = aws_subnet.public_subnet[*].id
}

output "private_route_table_ids" {
  description = "IDs of the private route tables"
  value       = aws_route_table.private_rt[*].id
}
