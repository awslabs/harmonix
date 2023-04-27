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
./aws/install

GITLAB_HOST_NAME=###gitlab_host###

ADMIN_USERNAME=$(aws secretsmanager get-secret-value --secret-id baws-admin-gitlab-secrets| jq --raw-output '.SecretString' | jq -r .username)

ADMIN_GITLAB_PASSWORD=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 10 ; echo '')

ADMIN_TOKEN=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 25 ; echo '')

aws secretsmanager put-secret-value --secret-id baws-admin-gitlab-secrets --secret-string '{"apiToken":"'"$ADMIN_TOKEN"'", "password":"'"$ADMIN_GITLAB_PASSWORD"'", "username":"'"$ADMIN_USERNAME"'", "runnerRegistrationToken":"", "runnerId":""}'

gitlab-rails runner "u = User.new(username: '$ADMIN_USERNAME', email: 'example@amazon.com', name: '$ADMIN_USERNAME', password: '$ADMIN_GITLAB_PASSWORD', password_confirmation: '$ADMIN_GITLAB_PASSWORD'); u.skip_confirmation!; u.admin = true; u.save!; token = User.find_by_username('$ADMIN_USERNAME').personal_access_tokens.create(scopes: [:read_user, :read_repository, :api, :read_api, :write_repository], name: '$ADMIN_USERNAME-token'); token.set_token('$ADMIN_TOKEN'); token.save!;"

GROUP_ID=$(curl --location --request POST 'localhost/api/v4/groups/' --header "PRIVATE-TOKEN: $ADMIN_TOKEN" --header 'Content-Type: application/json' --data-raw '{ "path": "aws-app", "name": "aws-app", "visibility": "internal" }' | jq .id)

# configure the external_url to use for git clone actions
# see https://docs.gitlab.com/omnibus/settings/ssl/index.html#configure-a-reverse-proxy-or-load-balancer-ssl-termination
GITLAB_EXT_CONFIG_FILE=$HOME/external_gitlab.rb
echo "from_file \"$GITLAB_EXT_CONFIG_FILE\"" >> /etc/gitlab/gitlab.rb
touch "$GITLAB_EXT_CONFIG_FILE"
echo "external_url \"https://${GITLAB_HOST_NAME}\"" >> "$GITLAB_EXT_CONFIG_FILE"
echo "nginx['listen_port'] = 80" >> "$GITLAB_EXT_CONFIG_FILE"
echo "nginx['listen_https'] = false" >> "$GITLAB_EXT_CONFIG_FILE"
echo "Restarting GitLab..."
gitlab-ctl reconfigure
echo "GitLab has been restarted"
echo ""
echo "Getting runner registration token..."
RUNNER_TOKEN=$(sudo gitlab-rails runner -e production "puts Gitlab::CurrentSettings.current_application_settings.runners_registration_token")
echo "Finished getting runner registration token"
if [[ ! -z "$RUNNER_TOKEN" ]]; then
    echo "Setting runner registration token into secret for later retrieval when runners are registered"
    aws secretsmanager put-secret-value --secret-id baws-admin-gitlab-secrets --secret-string '{"apiToken":"'"$ADMIN_TOKEN"'", "password":"'"$ADMIN_GITLAB_PASSWORD"'", "username":"'"$ADMIN_USERNAME"'", "runnerRegistrationToken":"'"$RUNNER_TOKEN"'", "runnerId":""}'
else
    echo "FAILED to get GitLab Runner registration token"
    echo "The registration token can be retrieved manually through the GitLab admin UI"
fi
