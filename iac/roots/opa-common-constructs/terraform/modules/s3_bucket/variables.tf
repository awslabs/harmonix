variable "name_prefix" {
  type        = string
  description = "Prefix for the S3 Bucket's name, ensuring it's full name is unique"

}

variable "log_bucket" {
  type        = string
  description = "Target bucket for access logs (optional). If not provided, bucket will store log in itself"
  default     = null
}

variable "access_policy" {
  type        = string
  description = "Access policy for the bucket (in json)"
  default     = null
}

variable "kms_key_id" {
  type        = string
  description = "Optional ID of the KMS key"
  default     = null
}

variable "enable_eventbridge_notifications" {
  type        = bool
  default     = false
  description = "Enable or disable EventBridge notifications from the biucket. Defaults to false"
}