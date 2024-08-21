output "arn" {
  value       = resource.aws_dynamodb_table.table.arn
  description = "ARN of the dynamo db table"
}

output "stream_arn" {
  value       = resource.aws_dynamodb_table.table.stream_arn
  description = "ARN of the dynamo db table stream"
}