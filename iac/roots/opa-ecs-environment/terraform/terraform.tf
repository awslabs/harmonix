# Copyright 2024 Amazon.com and its affiliates; all rights reserved.
# This file is Amazon Web Services Content and may not be duplicated or distributed without permission.

terraform {
  cloud {
    #   organization = "" # Set through the TF_CLOUD_ORGANIZATION env var
      workspaces {
        name    = "${{ values.name }}" # This can also be set through the TF_WORKSPACE env var
    #     project = ""  # Set through the TF_CLOUD_PROJECT env var
      }
    #   hostname = "app.terraform.io" # Set through the TF_CLOUD_HOSTNAME env var
  }
  required_version = ">= 1.7.5, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.42"
    }
  }
}
