#!/usr/bin/env bash

# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

# We cannot use IaC to populate secrets since the value of the secret would be exposed.
# Instead, this script uses the AWS CLI to create secrets where the values come from environment variables
# and the values of the secrets are not exposed anywhere.

# This script can perform a create/update action or a deletion of secrets. The default mode
# is create/update. To enable deletion mode, pass "delete" as the first argument to this script.

# This script should be called (in create/update mode) before the opa-platform IaC is deployed.

scriptDir=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
source $scriptDir/helpers.sh

confirm_aws_account

cd $scriptDir

# BEGIN GITHUB SECRET ------------------------------------------------------------------------

if [[ ! -z "$GITHUB_SECRET_NAME" ]]; then
    if [[ "$1" == "delete" ]]; then
        echo -e "\nDeleting $GITHUB_SECRET_NAME"
        aws secretsmanager delete-secret --secret-id $GITHUB_SECRET_NAME --force-delete-without-recovery --no-cli-pager
    else
        echo -e "\nCreating/Updating GitHub $GITHUB_SECRET_NAME secret...\n"

        # Validation of required settings
        if [[ -z "$GITHUB_TOKEN" ]]; then
            echo_error "GITHUB_TOKEN must be set" >&2;
            exit 1
        fi

        echo "{\"username\": \"opa-admin\", \"apiToken\": \"$GITHUB_TOKEN\", \"password\": \"\"}" > $scriptDir/tempSecretToCreate.json

        if cmdOutput=$(aws secretsmanager describe-secret --secret-id $GITHUB_SECRET_NAME 2> /dev/null); then
            echo "Updating existing secret:"
            aws secretsmanager put-secret-value --secret-id $GITHUB_SECRET_NAME --secret-string file://tempSecretToCreate.json
        else
            echo "Creating new secret:"
            aws secretsmanager create-secret --name $GITHUB_SECRET_NAME \
            --description "OPA GitHub connection info" \
            --secret-string file://tempSecretToCreate.json
        fi

        if [ $? -eq 0 ]; then
            echo_ok "Successfully set GitHub $GITHUB_SECRET_NAME secret"
        else
            echo_error "failed to set GitHub Cloud $GITHUB_SECRET_NAME secret" >&2;
            exit 1
        fi

        rm $scriptDir/tempSecretToCreate.json

        echo ""
    fi

else
    echo_warn "Skipping GitHub secret"
fi

# END GITHUB SECRET --------------------------------------------------------------------------

# BEGIN GITLAB SECRET ------------------------------------------------------------------------

if [[ ! -z "$GITLAB_SECRET_NAME" ]]; then
    if [[ "$1" == "delete" ]]; then
        echo -e "\nDeleting $GITLAB_SECRET_NAME"
        aws secretsmanager delete-secret --secret-id $GITLAB_SECRET_NAME --force-delete-without-recovery --no-cli-pager
    else
        echo -e "\nCreating/Updating GitLab $GITLAB_SECRET_NAME secret...\n"

        echo "{\"username\": \"opa-admin\", \"apiToken\": \"\", \"password\": \"\", \"runnerRegistrationToken\": \"\", \"runnerId\": \"\"}" > $scriptDir/tempSecretToCreate.json

        if cmdOutput=$(aws secretsmanager describe-secret --secret-id $GITLAB_SECRET_NAME 2> /dev/null); then
            echo "Updating existing secret:"
            aws secretsmanager put-secret-value --secret-id $GITLAB_SECRET_NAME --secret-string file://tempSecretToCreate.json
        else
            echo "Creating new secret:"
            aws secretsmanager create-secret --name $GITLAB_SECRET_NAME \
            --description "OPA GitLab connection info" \
            --secret-string file://tempSecretToCreate.json
        fi

        if [ $? -eq 0 ]; then
            echo_ok "Successfully set GitLab $GITLAB_SECRET_NAME secret"
        else
            echo_error "failed to set GitLab Cloud $GITLAB_SECRET_NAME secret" >&2;
            exit 1
        fi

        rm $scriptDir/tempSecretToCreate.json

        echo ""
    fi

else
    echo_warn "Skipping GitLab secret"
fi

# END GITLAB SECRET --------------------------------------------------------------------------

# BEGIN HARNESS SECRET ------------------------------------------------------------------------

if [[ ! -z "$HARNESS_ACCESS_TOKEN" ]]; then
    export HARNESS_SECRET_NAME="$APP_NAME-admin-harness-secrets"

    if [[ "$1" == "delete" ]]; then
        echo -e "\nDeleting $HARNESS_ACCESS_TOKEN"
        aws secretsmanager delete-secret --secret-id $HARNESS_SECRET_NAME --force-delete-without-recovery --no-cli-pager
    else
        echo -e "\nCreating/Updating Harness $HARNESS_SECRET_NAME secret...\n"

        # Validation of required settings
        if [[ -z "$HARNESS_ACCOUNT_NUMBER" ]]; then
            echo_error "HARNESS_ACCOUNT_NUMBER must be set" >&2;
            exit 1
        fi

        echo "{\"accountNumber\": \"$HARNESS_ACCOUNT_NUMBER\", \"token\": \"$HARNESS_ACCESS_TOKEN\"}" > $scriptDir/tempSecretToCreate.json

        if cmdOutput=$(aws secretsmanager describe-secret --secret-id $HARNESS_SECRET_NAME 2> /dev/null); then
            echo "Updating existing secret:"
            aws secretsmanager put-secret-value --secret-id $HARNESS_SECRET_NAME --secret-string file://tempSecretToCreate.json
        else
            echo "Creating new secret:"
            aws secretsmanager create-secret --name $HARNESS_SECRET_NAME \
            --description "OPA Harness CICD connection info" \
            --secret-string file://tempSecretToCreate.json
        fi

        if [ $? -eq 0 ]; then
            echo_ok "Successfully set Harness $HARNESS_SECRET_NAME secret"
        else
            echo_error "failed to set Harness $HARNESS_SECRET_NAME secret" >&2;
            exit 1
        fi

        rm $scriptDir/tempSecretToCreate.json

        echo ""
    fi

else
    echo_warn "Skipping Harness secret"
fi

# END HARNESS SECRET --------------------------------------------------------------------------

# BEGIN TERRAFORM CLOUD SECRET ------------------------------------------------------------------------

if [[ ! -z "$TERRAFORM_CLOUD_TOKEN" ]]; then
    export TERRAFORM_CLOUD_SECRET_NAME="$APP_NAME-admin-terraform-cloud-secrets"

    if [[ "$1" == "delete" ]]; then
        echo -e "\nDeleting $TERRAFORM_CLOUD_TOKEN"
        aws secretsmanager delete-secret --secret-id $TERRAFORM_CLOUD_SECRET_NAME --force-delete-without-recovery --no-cli-pager
    else
        echo -e "\nCreating/Updating Terraform Cloud $TERRAFORM_CLOUD_SECRET_NAME secret...\n"

        # Validation of required settings
        if [[ -z "$TERRAFORM_CLOUD_ORGANIZATION" ]]; then
            echo_error "TERRAFORM_CLOUD_ORGANIZATION must be set" >&2;
            exit 1
        fi
        if [[ -z "$TERRAFORM_CLOUD_HOSTNAME" ]]; then
            export TERRAFORM_CLOUD_HOSTNAME="app.terraform.io" # use default value
        fi

        echo "{\"hostname\": \"$TERRAFORM_CLOUD_HOSTNAME\", \"organization\": \"$TERRAFORM_CLOUD_ORGANIZATION\", \"token\": \"$TERRAFORM_CLOUD_TOKEN\"}" > $scriptDir/tempSecretToCreate.json

        if cmdOutput=$(aws secretsmanager describe-secret --secret-id $TERRAFORM_CLOUD_SECRET_NAME 2> /dev/null); then
            echo "Updating existing secret:"
            aws secretsmanager put-secret-value --secret-id $TERRAFORM_CLOUD_SECRET_NAME --secret-string file://tempSecretToCreate.json
        else
            echo "Creating new secret:"
            aws secretsmanager create-secret --name $TERRAFORM_CLOUD_SECRET_NAME \
            --description "OPA Terraform cloud connection info" \
            --secret-string file://tempSecretToCreate.json
        fi

        if [ $? -eq 0 ]; then
            echo_ok "Successfully set Terraform Cloud $TERRAFORM_CLOUD_SECRET_NAME secret"
        else
            echo_error "failed to set Terraform Cloud $TERRAFORM_CLOUD_SECRET_NAME secret" >&2;
            exit 1
        fi

        rm $scriptDir/tempSecretToCreate.json

        echo ""
    fi

else
    echo_warn "Skipping Terraform Cloud secret"
fi

# END TERRAFORM CLOUD SECRET --------------------------------------------------------------------------

# BEGIN OKTA IDENTITY PROVIDER SECRET ------------------------------------------------------------------------

if [[ ! -z "$OKTA_SECRET_NAME" ]]; then
    if [[ "$1" == "delete" ]]; then
        echo -e "\nDeleting $OKTA_SECRET_NAME"
        aws secretsmanager delete-secret --secret-id $OKTA_SECRET_NAME --force-delete-without-recovery --no-cli-pager
    else
        echo -e "\nCreating/Updating OKTA IDP $OKTA_SECRET_NAME secret...\n"

        # Validation of required settings
        if [[ -z "$OKTA_API_TOKEN" ]]; then
            echo_error "OKTA_API_TOKEN must be set" >&2;
            exit 1
        fi
        if [[ -z "$OKTA_AUDIENCE" ]]; then
            echo_error "OKTA_AUDIENCE must be set" >&2;
            exit 1
        fi
        if [[ -z "$OKTA_CLIENT_ID" ]]; then
            echo_error "OKTA_CLIENT_ID must be set" >&2;
            exit 1
        fi
        if [[ -z "$OKTA_CLIENT_SECRET" ]]; then
            echo_error "OKTA_CLIENT_SECRET must be set" >&2;
            exit 1
        fi

        # Check optional settings
        if [[ "$OKTA_AUTH_SERVER_ID" == "blank" ]]; then
            OKTA_AUTH_SERVER_ID=""
        fi
        if [[ "$OKTA_IDP" == "blank" ]]; then
            OKTA_IDP=""
        fi

        echo "{\"clientId\": \"$OKTA_CLIENT_ID\", \"clientSecret\": \"$OKTA_CLIENT_SECRET\", \"audience\": \"$OKTA_AUDIENCE\", \"authServerId\": \"$OKTA_AUTH_SERVER_ID\", \"idp\": \"$OKTA_IDP\", \"apiToken\": \"$OKTA_API_TOKEN\"}" > $scriptDir/tempSecretToCreate.json

        if cmdOutput=$(aws secretsmanager describe-secret --secret-id $OKTA_SECRET_NAME 2> /dev/null); then
            echo "Updating existing secret:"
            aws secretsmanager put-secret-value --secret-id $OKTA_SECRET_NAME --secret-string file://tempSecretToCreate.json
        else
            echo "Creating new secret:"
            aws secretsmanager create-secret --name $OKTA_SECRET_NAME \
            --description "OPA OKTA IDP connection info" \
            --secret-string file://tempSecretToCreate.json
        fi

        if [ $? -eq 0 ]; then
            echo_ok "Successfully set OKTA IDP $OKTA_SECRET_NAME secret"
        else
            echo_error "failed to set OKTA IDP $OKTA_SECRET_NAME secret" >&2;
            exit 1
        fi

        rm $scriptDir/tempSecretToCreate.json

        echo ""
    fi

else
    echo_warn "Skipping OKTA IDP secret"
fi

cd - > /dev/null
echo ""