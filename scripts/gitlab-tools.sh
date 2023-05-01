###########
# This file will attempt to create a repo and if it can't it will still 
# push backstage-reference to your gitlab repo
###########

set -o pipefail # FAIL FAST
source ./scripts/helpers.sh
shopt -s expand_aliases

set_env
CONFIG_LOCATION="./infrastructure"

echo "Fetching gitlab secret creds"

# Retrieve config specific information (secret names + hosted zone)
GITLAB_SECRET_NAME=$(get_config_value $CONFIG_LOCATION GitlabSecret)
HOSTED_ZONE=$(get_config_value $CONFIG_LOCATION R53HostedZoneName)
# echo HOSTED_ZONE=$HOSTED_ZONE

# Get secret value from secretsmanager
GITLAB_SECRET_VALUE=$(get_secret_value $GITLAB_SECRET_NAME)

# Parse secretsmanager return string/json
GITLAB_USERNAME=$(echo $GITLAB_SECRET_VALUE | jq -r '.username')
GITLAB_PASSWORD=$(echo $GITLAB_SECRET_VALUE | jq -r '.password')
GITLAB_TOKEN=$(echo $GITLAB_SECRET_VALUE | jq -r '.apiToken')
echo GITLAB_USERNAME=$GITLAB_USERNAME

# Try to create a new project if one doesn't exist (will fail through)
curl -H "Content-Type:application/json" https://git.$HOSTED_ZONE/api/v4/projects?private_token=$GITLAB_TOKEN -d "{ \"name\": \"backstage-reference\" }"

# Make tmp directory to add files tha twill be comitted to repo
mkdir -p git-temp
git -C git-temp clone https://oauth2:$GITLAB_TOKEN@git.$HOSTED_ZONE/baws-admin/backstage-reference.git
cp -R backstage-reference/* git-temp/backstage-reference
cd git-temp/backstage-reference;

# Replace variables with env specific information
find . -type f -name *.yaml -exec sed -i "" "s/{{ *gitlab_hostname *}}/git.$HOSTED_ZONE/g" {} +; 
find . -type f -name *.yaml -exec sed -i "" "s/{{ *aws-account *}}/$CURR_AWS_ACCOUNT/g" {} +; 

# Add and commit changes to repo
git add --all;
git commit -m "Reference Commit";
git push
echo "Finished Setting up reference repo."