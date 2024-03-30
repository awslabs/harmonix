---
sidebar_position: 1
---

# AWS Control Tower and AFT

### Introduction
This article will describe how to inegrate OPA on AWS with AWS Control Tower and AFT-[Account Factory for Terraform](https://github.com/aws-ia/terraform-aws-control_tower_account_factory).


## Architecture
<p align="center">
  <img src="/img/diagrams/aft-architecture.png" />
</p>
* In the above architecture, we created a seprate OU to host IAC orchestration and an account for AFT to be deployed.
* We can also use the same OU to host OPA on AWS Platform and it's platform artifacts - this is **not** for workload controlled accounts 

## Installing AWS Control Tower and AFT

AWS Control Tower: **Must be deployed in your environment**.

Account Factory for Terraform (AFT): Must be deployed and configured with your Control Tower environment.

* For setting up Control Tower, follow this [link](https://docs.aws.amazon.com/controltower/latest/userguide/setting-up.html).
* For integrating AFT with your Control Tower environment, follow this [link](https://developer.hashicorp.com/terraform/tutorials/aws/aws-control-tower-aft).


## Integrating OPA on AWS to AFT
### Introduction
The AFT pipeline provide a process that create accounts by submitting a request to "account-requests" repository, as shown in the below diagram:

<p align="center">
  <img src="/img/diagrams/aft-pipeline.png" />
</p>

The integration with OPA on AWS Platform is based on the principle of customization template - that creates a pre-baked role, that the platform / OPA pipeline can use to provision resources.

### Step 1: Create OPA Management Account

This step is option. You can choose to deploy OPA in any existing account; however, we as a best practice we discourage doing so.

1. Create an AWS account within your Control Tower environment named `OPA Management`. This account will host the OPA infrastructure.
2. AFT Repositories: AFT supports four repositories for account management and customizations:

  * account_request_repo_name: Manages new account requests.
  * global_customizations_repo_name: Applies customizations across all AFT-created accounts.
  * account_customizations_repo_name: Customizes specific accounts.
  * account_provisioning_customizations_repo_name: Sets up custom non-Terraform integrations pre-account provisioning.

1. Account Request:

  * Add an account request for the `OPA Management` account in the account_request repository.

```tree
├── account-request
│   └── terraform
│       ├── aft-providers.jinja
│       ├── backend.jinja
│       ├── modules
│       │   └── aft-account-request
│       │       ├── ddb.tf
│       │       ├── variables.tf
│       │       └── versions.tf
│       └── opa_account-request.tf
```


opa_account-request.tf ->
```terraform
module "opa_account_admin" {
  source = "./modules/aft-account-request"
  
  control_tower_parameters = {
    AccountEmail              = "<email>"
    AccountName               = "OPA Management"
    ManagedOrganizationalUnit = "<ou>"
    SSOUserEmail              = "<user-email>"
    SSOUserFirstName          = "<first-name>"
    SSOUserLastName           = "<last-name>"
  }
  
  account_tags = {
    "Owner"       = "<owner>"
    "Division"    = "<division>"
    "Environment" = "<env>"
    "CostCenter"  = "<cost-center>"
    "BUCode"      = "<bu-code>"
    "Project"     = "OPA"
  }
  
  change_management_parameters = {
    change_requested_by = "Organization AWS Control Tower Admin"
    change_reason       = "Deploy OPA Management Account to host OPA infrastructure"
  }
  
  custom_fields = {
    note = "This account will be used to deploy OPA management portal infrastructure"
  }
}
```

* Push these changes to trigger account creation with AFT. Wait for completion before proceeding to Step 2.

### Step 2: Deploy OPA

1. Access: Ensure you have access to the OPA management account with the necessary permissions to deploy required infrastructure.
2. Installation: Follow OPA installation steps via this [link](../getting-started/deploy-the-platform.md).


### Step 3: Set up IAM Role for Application Account

1. Automation with AFT: Use AFT for automating IAM role creation (**OPAExecutionRole**) in the Application account, allowing OPA Management account to manage resources.
2. Customization Code:

  * Specify this as a template (**OPA_INTEGRATION**) in the Account Customization AFT repository.

```tree
├── account-customizations
│   └── OPA_INTEGRATION
│       ├── api_helpers
│       │   ├── post-api-helpers.sh
│       │   ├── pre-api-helpers.sh
│       │   └── python
│       │       └── requirements.txt
│       └── terraform
│           ├── aft-providers.jinja
│           ├── backend.jinja
│           └── main.tf
```

main.tf ->
```terraform
data "aws_ssm_parameter" "opa_org_id" {
  name = "/aft/account-request/custom-fields/opa-org-id"
}

data "aws_ssm_parameter" "aft_management_account_id" {
  name = "/aft/account-request/custom-fields/opa-account-id"
}

data "aws_ssm_parameter" "opa_pipeline_role" {
  name = "/aft/account-request/custom-fields/opa-pipeline-role"
}

data "aws_ssm_parameter" "opa_platform_role" {
  name = "/aft/account-request/custom-fields/opa-platform-role"
}

data "aws_iam_policy_document" "assume_role_policy" {
  statement {
    effect  = "Allow"

    principals {
      type        = "AWS"
      identifiers = [
        data.aws_ssm_parameter.opa_platform_role.value,
        data.aws_ssm_parameter.opa_pipeline_role.value
      ]
    }

    actions = ["sts:AssumeRole"]

  }
}

resource "aws_iam_role" "admin_role" {
  name               = "OPAExecutionRole"
  assume_role_policy = data.aws_iam_policy_document.assume_role_policy.json
}

resource "aws_iam_role_policy_attachment" "admin_attach" {
  role       = aws_iam_role.admin_role.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}
```

* Push Customization Code: Update the specified account customization repository with this code.

![OPA Management Account Iam role flow with Application account](./opa-iam-role.png)

### Step 4: Create Application Account for OPA Integration

1. Account Request:

  * Create an Application account creation request tailored for OPA on AWS.
```tree
├── account-request
│   └── terraform
│       ├── aft-providers.jinja
│       ├── backend.jinja
│       ├── modules
│       │   └── aft-account-request
│       │       ├── ddb.tf
│       │       ├── variables.tf
│       │       └── versions.tf
│       ├── opa_moderated_account1.tf
│       └── opa_account-request.tf
```

opa_moderated_account1.tf->
```terraform
module "opa_app_account_1" {
  source = "./modules/aft-account-request"

  control_tower_parameters = {
    AccountEmail              = ""
    AccountName               = "OPA Applicartion Account 1"
    ManagedOrganizationalUnit = "Sandbox"
    SSOUserEmail              = ""
    SSOUserFirstName          = ""
    SSOUserLastName           = ""
  }

  account_tags = {
    "Owner"       = ""
    "Division"    = ""
    "Environment" = ""
    "CostCenter"  = ""
    "BUCode"      = ""
    "Project"     = "OPA"
  }

  change_management_parameters = {
    change_requested_by = "Organization AWS Control Tower Admin"
    change_reason       = "Deploy OPA Application Account 1"
  }

  custom_fields = {
    note = "This account will be used to deploy applications from OPA management portal"
    opa-org-id = "OPA_ORG_ID"
    opa-account-id = "OPA_ACCOUNT_ID"
    opa-pipeline-role = "OPA_PIPELINE_IAM_ROLE"
    opa-platform-role = "arn:aws:iam::OPA_ACCOUNT_ID:role/backstage-master-role"
  }

  account_customizations_name = "OPA_INTEGRATION"
}
```

**Note**: We are using custom_fields here to inject variables that will be used by the Account Customization OPA_INTEGRATION template

The actual values for these variable needs to be fetched from the OPA management account and Control Tower management account


* Login to the OPA Management account under the IAM service and Role. Copy the opa-pipeline-role and opa-platform-role
* Login to the Control Tower management account. From the Control Tower service -> Organization tab, copy the OPA management account ID and the Organization ID that the  OPA management account is part of.

1. Completion:

  * Push the request to the Account Request repo and wait for account creation to complete.


Congratulations! You have successfully set up an Application account ready for OPA integration. For deploying applications using OPA, follow this [link](../getting-started/videos.md).
