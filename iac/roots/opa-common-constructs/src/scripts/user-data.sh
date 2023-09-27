# // Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# // SPDX-License-Identifier: Apache-2.0

exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

# Perform update - required so that jq/unzip packages are available
apt update
# apt upgrade -y
apt install jq -y
apt install unzip -y
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
echo "Installing AWS CLI..."
./aws/install 1> /dev/null

echo "Begin custom steps"

for i in {1..1001..1}
do
  echo ""
  echo "Looking up secret value for GITLAB_URL"
  GITLAB_URL=`aws ssm get-parameter --name "/opa/gitlab-url" --output text --query Parameter.Value --with-decryption`
  if [[ -z "$GITLAB_URL" ]]; then
    echo "Sleeping for 20 seconds"
    sleep 20
  else
    echo "GITLAB_URL is \"$GITLAB_URL\""
    ADMIN_USERNAME=$(aws secretsmanager get-secret-value --secret-id opa-admin-gitlab-secrets| jq --raw-output '.SecretString' | jq -r .username)
    if [[ -z "$ADMIN_USERNAME" ]]; then
        echo "ERROR: could not get ADMIN_USERNAME"
    fi

    ADMIN_GITLAB_PASSWORD=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 10 ; echo '')
    if [[ -z "$ADMIN_GITLAB_PASSWORD" ]]; then
        echo "ERROR: could not get ADMIN_GITLAB_PASSWORD"
    fi

    ADMIN_TOKEN=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 25 ; echo '')

    echo "Saving admin token"
    aws secretsmanager put-secret-value --secret-id opa-admin-gitlab-secrets --secret-string '{"apiToken":"'"$ADMIN_TOKEN"'", "password":"'"$ADMIN_GITLAB_PASSWORD"'", "username":"'"$ADMIN_USERNAME"'", "runnerRegistrationToken":"", "runnerId":""}'

    echo "Updating GitLab admin user name, password and token"
    gitlab-rails runner "u = User.new(username: '$ADMIN_USERNAME', email: 'example@amazon.com', name: '$ADMIN_USERNAME', password: '$ADMIN_GITLAB_PASSWORD', password_confirmation: '$ADMIN_GITLAB_PASSWORD'); u.skip_confirmation!; u.admin = true; u.save!; token = User.find_by_username('$ADMIN_USERNAME').personal_access_tokens.create(scopes: [:read_user, :read_repository, :api, :read_api, :write_repository], name: '$ADMIN_USERNAME-token'); token.set_token('$ADMIN_TOKEN'); token.save!;"

    GROUP_ID=$(curl --location --request POST 'localhost/api/v4/groups/' --header "PRIVATE-TOKEN: $ADMIN_TOKEN" --header 'Content-Type: application/json' --data-raw '{ "path": "aws-app", "name": "aws-app", "visibility": "internal" }' | jq .id)

    echo "Configuring the external_url to use for git clone actions..."
    # see https://docs.gitlab.com/omnibus/settings/ssl/index.html#configure-a-reverse-proxy-or-load-balancer-ssl-termination
    GITLAB_EXT_CONFIG_FILE=$HOME/external_gitlab.rb
    echo "GITLAB_EXT_CONFIG_FILE was set to $GITLAB_EXT_CONFIG_FILE"

    # Configuring GitLab to use the configurations we set into GITLAB_EXT_CONFIG_FILE
    echo "from_file \"$GITLAB_EXT_CONFIG_FILE\"" >> /etc/gitlab/gitlab.rb

    # Creating GitLab configuration extensions file
    touch "$GITLAB_EXT_CONFIG_FILE"
    echo "external_url \"${GITLAB_URL}\"" >> "$GITLAB_EXT_CONFIG_FILE"
    echo "nginx['listen_port'] = 80" >> "$GITLAB_EXT_CONFIG_FILE"
    echo "nginx['listen_https'] = false" >> "$GITLAB_EXT_CONFIG_FILE"
    echo "GitLab external configs:"
    cat "$GITLAB_EXT_CONFIG_FILE"

    echo "Restarting GitLab..."
    gitlab-ctl reconfigure
    echo "GitLab has been restarted"
    echo ""
    
    echo "Getting runner registration token..."
    RUNNER_TOKEN=$(sudo gitlab-rails runner -e production "puts Gitlab::CurrentSettings.current_application_settings.runners_registration_token")
    echo "Finished getting runner registration token"
    if [[ ! -z "$RUNNER_TOKEN" ]]; then
        echo "Setting runner registration token into secret for later retrieval when runners are registered"
        aws secretsmanager put-secret-value --secret-id opa-admin-gitlab-secrets --secret-string '{"apiToken":"'"$ADMIN_TOKEN"'", "password":"'"$ADMIN_GITLAB_PASSWORD"'", "username":"'"$ADMIN_USERNAME"'", "runnerRegistrationToken":"'"$RUNNER_TOKEN"'", "runnerId":""}'
    else
        echo "FAILED to get GitLab Runner registration token"
        echo "The registration token can be retrieved manually through the GitLab admin UI"
    fi
    break
  fi
done

