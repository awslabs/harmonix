locals {
  tags = {
    "Env" = "${var.ENV_NAME}"
  }

  # Set 'envName' as a local variable which is converted to lower case
  envName           = lower(var.ENV_NAME)
  prefix            = lower(var.PREFIX)
  envPathIdentifier = "/${local.prefix}/${local.envName}"
  cidrInput         = var.ENV_CIDR
  target_region     = var.AWS_DEFAULT_REGION
}
