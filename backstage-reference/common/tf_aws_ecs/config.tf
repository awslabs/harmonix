terraform {
  backend "s3" {
    # check backend.conf for the rest of the bucket and dynamodb config
    key    = "global/terraform.tfstate"
    encrypt = true
  }
}