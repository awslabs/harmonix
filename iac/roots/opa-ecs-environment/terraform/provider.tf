# Copyright 2024 Amazon.com and its affiliates; all rights reserved.
# This file is Amazon Web Services Content and may not be duplicated or distributed without permission.

provider "aws" {
  # Update desired region
  region = local.target_region

  default_tags {
    tags = {
      Env     = local.envName
    }
  }
}

provider "aws" {
  alias  = "us_east"
  region = "us-east-1"
  default_tags {
    tags = {
      Env = local.envName
    }
  }
}
