#
# Create outputs here
#
output "arn" {
  description = "ARN of the KMS key created"
  value       = aws_kms_key.key.arn
}