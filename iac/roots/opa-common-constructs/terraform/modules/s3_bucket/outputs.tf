output "id" {
  value       = aws_s3_bucket.bucket.id
  description = "ID of S3 bucket"
}

output "name" {
  value       = aws_s3_bucket.bucket.bucket
  description = "Name of S3 bucket"
}

output "arn" {
  value       = aws_s3_bucket.bucket.arn
  description = "ARN of S3 bucket"
}


output "regional_domain_name" {
  value       = aws_s3_bucket.bucket.bucket_regional_domain_name
  description = "Regional domain name of S3 bucket"
}