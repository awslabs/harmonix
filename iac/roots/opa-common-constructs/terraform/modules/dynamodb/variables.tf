variable "table_name" {
  type        = string
  description = "Name of the table"
}

variable "hash_key" {
  type        = string
  description = "Hash key"
}

variable "range_key" {
  type        = string
  default     = null
  description = "Sort key"
}

variable "stream_enabled" {
  type        = bool
  default     = false
  description = "Enable streaming of changes (defaults to false)"
}

variable "attributes" {
  type        = list(any)
  default     = []
  description = "Include additional attributes and those used for secondary indices here"
}

variable "local_secondary_indices" {
  type        = list(any)
  default     = []
  description = "List of objects which each describe a local secondary index"
}

variable "global_secondary_indices" {
  type        = list(any)
  default     = []
  description = "List of objects which each describe a global secondary index"
}

variable "encryption_key_arn" {
  type = string
  # default = null  # TODO: commenting out for now until optional key arn is supported
  description = "ARN of the KMS key to use for encryption"
}