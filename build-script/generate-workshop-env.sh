#!/bin/bash

# Define the filename
env_file=".env"

# Check if the file already exists and ask for confirmation to overwrite
if [ -f "$env_file" ]; then
    read -p "The $env_file already exists. Do you want to overwrite it? (y/n): " overwrite
    if [ "$overwrite" != "y" ]; then
        echo "Aborted."
        exit 1
    fi
fi

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
# SECRET_GITLAB_CONFIG_PROP_apiToken=$(aws secretsmanager get-secret-value --secret-id opa-admin-gitlab-secrets --output text --query 'SecretString' | jq -r '.apiToken')
# SSM_GITLAB_HOSTNAME=$(aws ssm get-parameter --name "/opa/gitlab-hostname" --query "Parameter.Value" --output text)

# Create or overwrite the .env file
cat > "./config/$env_file" <<EOL

AWS_ACCOUNT_ID=$AWS_ACCOUNT_ID

AWS_DEFAULT_REGION=$AWS_DEFAULT_REGION

GITLAB_AMI=$GITLAB_AMI

GITLAB_RUNNER_AMI=$GITLAB_RUNNER_AMI

R53_HOSTED_ZONE_NAME=$R53_HOSTED_ZONE_NAME

ALLOWED_IPS=$ALLOWED_IPS

OKTA_API_TOKEN=$OKTA_API_TOKEN
OKTA_AUDIENCE=$OKTA_AUDIENCE
OKTA_AUTH_SERVER_ID=""
OKTA_CLIENT_ID=$OKTA_CLIENT_ID
OKTA_CLIENT_SECRET=$OKTA_CLIENT_SECRET
OKTA_IDP=""

SECRET_GITLAB_CONFIG_PROP_apiToken="TODO"

CUSTOMER_NAME=$CUSTOMER_NAME

CUSTOMER_LOGO=$CUSTOMER_LOGO

CUSTOMER_LOGO_ICON=$CUSTOMER_LOGO_ICON

BACKSTAGE_SCAFFOLDER_NAME="Backstage Scaffolder"

BACKSTAGE_SCAFFOLDER_EMAIL="mycompany-admin@amazon.com"

POSTGRES_HOST="localhost"
POSTGRES_PORT="5432"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="example"

SSM_GITLAB_HOSTNAME="TODO"

EOL

echo "The $env_file has been generated."

# Print the contents of the generated file
echo "Contents of $env_file:"
cat "./config/$env_file"
