set_env() {
    CURR_AWS_ACCOUNT=$(aws sts get-caller-identity --query "Account" --output text)
    REGION=$(cat ./infrastructure/config.yaml ./infrastructure/config.$CURR_AWS_ACCOUNT.local.yaml | grep '^Region' | tail -1 | sed -r 's/.*\: ?"?([^"]*)"?/\1/')
}

# ! Note for the following commands set_env has to be called first

############################
# Config Value Helper Function #
############################
# Gets config value from config.yaml file
# Inputs:
# 1: Config file location
# 2: Config Variable Name
# Example: $(get_config_value $CONFIG_LOCATION R53HostedZoneName)
get_config_value() {
    CONFIG_VALUE=$(cat $1/config.yaml $1/config.$CURR_AWS_ACCOUNT.local.yaml | grep "^$2" | tail -1 | sed -r 's/.*\: ?"?([^"]*)"?/\1/')
    echo $CONFIG_VALUE
}

############################
# Secret Value Helper Function #
############################
# Gets secret value from named secret
# Inputs:
# 1: Config file location
# 2: Config Variable Name
# Example: $(get_secret_value $OKTA_SECRET_NAME)
get_secret_value() {
    SECRET_VALUE=$(aws secretsmanager get-secret-value --secret-id $1 --region $REGION --output json | jq --raw-output '.SecretString')
    echo $SECRET_VALUE
}