set -o pipefail # FAIL FAST
source ./scripts/helpers.sh
shopt -s expand_aliases

ENV_FILENAME="config/.env"

# Get Account and Region
set_env
CONFIG_LOCATION="./infrastructure"
echo "Setting env vars for development using account: $CURR_AWS_ACCOUNT"

# Define helper functions for pretty output
echo_ok()    { echo '\033[1;32m'"$1"'\033[0m'; }
echo_warn()  { echo '\033[1;33m'"$1"'\033[0m'; }
echo_error() { echo '\033[1;31mERROR: '"$1"'\033[0m'; }

_get_all_config_values() {
  # Retrieve config specific information (secret names + hosted zone)
  OKTA_SECRET_NAME=$(get_config_value $CONFIG_LOCATION OktaConfigSecret)
  DB_SECRET_NAME=$(get_config_value $CONFIG_LOCATION DbConfigSecret)
  HOSTED_ZONE=$(get_config_value $CONFIG_LOCATION R53HostedZoneName)
  echo HOSTED_ZONE=$HOSTED_ZONE
  GITLAB_SECRET_NAME=$(get_config_value $CONFIG_LOCATION GitlabSecret)
}

_get_all_secrets_values() {
  # Pull from secrets manager using secret names
  OKTA_SECRET_VALUE=$(get_secret_value $OKTA_SECRET_NAME)
  DB_SECRET_VALUE=$(get_secret_value $DB_SECRET_NAME)
  GITLAB_SECRET_VALUE=$(get_secret_value $GITLAB_SECRET_NAME)

  # Parse secretsmanager return string/json
  OKTA_ORG_URL=$(echo $OKTA_SECRET_VALUE | jq -r '.audience')
  OKTA_CLIENT_ID=$(echo $OKTA_SECRET_VALUE | jq -r '.clientId')
  OKTA_CLIENT_SECRET=$(echo $OKTA_SECRET_VALUE | jq -r '.clientSecret')
  OKTA_API_TOKEN=$(echo $OKTA_SECRET_VALUE | jq -r '.apiToken')
  DB_USERNAME=$(echo $DB_SECRET_VALUE | jq -r '.username')
  DB_PASSWORD=$(echo $DB_SECRET_VALUE | jq -r '.password')
  DB_HOST=$(echo $DB_SECRET_VALUE | jq -r '.host')
  DB_PORT=$(echo $DB_SECRET_VALUE | jq -r '.port')
  GITLAB_SECRET_TOKEN=$(echo $GITLAB_SECRET_VALUE | jq -r '.apiToken')
}

_get_all_config_values
_get_all_secrets_values

# Function to generically set a property in the backstage/.env file
# If the property already exists in the file, then the value will be updated.
# If not exist - then the property will be added
#
# Inputs:
# 1: Property name
# 2. New property value
set_property() {
  # test to see if the property exists
  if grep -Eq "^$1=" $ENV_FILENAME
  then
    # replace the existing property in the file
    sed -i '' -- "s|$1=.*|$1=$2|" $ENV_FILENAME
  else
    # append a new property to the file
    echo "$1=$2" >> $ENV_FILENAME
  fi
}


# Declare all of the required env vars for the backstage/.env file
requiredEnvVars=(
  "BACKSTAGE_HOSTNAME=$HOSTED_ZONE"
  "# CUSTOMER_NAME=AWS"
  "# CUSTOMER_LOGO=https://companieslogo.com/img/orig/AMZN_BIG-accd00da.png"
  "# CUSTOMER_LOGO_ICON=https://companieslogo.com/img/orig/AMZN.D-13fddc58.png"
  "GITLAB_ADMIN_TOKEN=$GITLAB_SECRET_TOKEN"
  "GITLAB_HOSTNAME=git.$HOSTED_ZONE"
  "OKTA_API_TOKEN=$OKTA_API_TOKEN"
  "OKTA_CLIENT_ID=$OKTA_CLIENT_ID"
  "OKTA_CLIENT_SECRET=$OKTA_CLIENT_SECRET"
  "OKTA_ORG_URL=$OKTA_ORG_URL"
  "POSTGRES_PASSWORD=$DB_PASSWORD"
  "POSTGRES_PORT=$DB_PORT"
  "POSTGRES_USER=$DB_USERNAME"
  "# POSTGRES_HOST=$DB_HOST"
)

for t in "${requiredEnvVars[@]}"; do
  set_property "${t%%=*}" "${t#*=}"
done

echo "All done."
