#
# Module's input variables
#
variable "alias" {
  description = "Key alias"
  type        = string
}

variable "description" {
  description = "Description of the key"
  type        = string
}

variable "roles" {
  description = "List of role (identity) ARNs that will be allowed to use the key for encryption/decryption purposes"
  type        = list(string)
  default     = []
}

variable "services" {
  description = "List of AWS services that will be allowed to use the key for encryption/decryption purposes"
  type        = list(string)
  default     = []
}

variable "via_services" {
  description = "List of AWS services that will allow any identity to use the key for encryption/decryption purposes"
  type        = list(string)
  default     = []
}

variable "key_policy" {
  description = "Optional JSON key policy if the default does not meet the requirements."
  type        = string
  default     = null
} 

variable "pending_window" {
  description = "Specifies the number of days in the waiting period before AWS KMS deletes a CMK that has been removed."
  type = number
  default = 8
}

variable "enable_key_rotation" {
  description = "Specifies whether the AWS KMS rotates the key"
  type = bool
  default = true
}