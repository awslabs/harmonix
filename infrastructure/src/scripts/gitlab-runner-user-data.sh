# // Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# // SPDX-License-Identifier: Apache-2.0

exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

# Perform update - required so that jq/unzip packages are available
apt update
apt install jq -y
apt install unzip -y
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
./aws/install

GITLAB_HOST_NAME=###gitlab_host###
GITLAB_SECRET_NAME=###gitlab_secret###

GITLAB_SECRET=$(aws secretsmanager get-secret-value --secret-id $GITLAB_SECRET_NAME | jq --raw-output '.SecretString')

GITLAB_SECRET_TOKEN=$(echo $GITLAB_SECRET | jq -r .apiToken)
RUNNER_ID=$(echo $GITLAB_SECRET | jq -r .runnerId)
if [[ -z "$RUNNER_ID" ]]; then
  echo "No prior runner ID found, skipping runner deregistration."
else
  echo "Deregistering prior GitLab Runner $RUNNER_ID"
  curl --request DELETE --header "PRIVATE-TOKEN: $GITLAB_SECRET_TOKEN" "https://${GITLAB_HOST_NAME}/api/v4/runners/${RUNNER_ID}"
fi

RUNNER_TOKEN=$(echo $GITLAB_SECRET | jq -r .runnerRegistrationToken)
RUNNER_URL="https://${GITLAB_HOST_NAME}/"

if [[ -z "$RUNNER_TOKEN" ]]; then
  echo "Runner registration token was not found in the secret."
  echo "Cannot register GitLab Runner."
  exit 1
fi

# Install Docker
echo ""
echo "Installing Docker"
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Download and install GitLab Runner
echo ""
echo "Downloading GitLab Runner"
sudo curl -L --output /usr/local/bin/gitlab-runner "https://gitlab-runner-downloads.s3.amazonaws.com/latest/binaries/gitlab-runner-linux-386"
sudo chmod +x /usr/local/bin/gitlab-runner

# Create GitLab CI User
sudo useradd --comment 'GitLab Runner' --create-home gitlab-runner --shell /bin/bash

# Install GitLab Runner and start the service
echo ""
echo "Installing GitLab Runner"
sudo gitlab-runner install --user=gitlab-runner --working-directory=/home/gitlab-runner
sudo gitlab-runner start

echo ""
echo "Registering GitLab Runner"
sudo gitlab-runner register \
--non-interactive \
--url $RUNNER_URL \
--registration-token $RUNNER_TOKEN \
--description "EC2 Gitlab Runner with Docker Executor" \
--run-untagged=true \
--executor docker \
--docker-tlsverify=false \
--docker-image docker:20.10.16 \
--docker-privileged=true \
--docker-disable-cache=false \
--docker-volumes "/certs/client"

# Set the runner ID into the secret
prefix="id = "
NEW_RUNNER_ID=$(grep "$prefix" /etc/gitlab-runner/config.toml)
NEW_RUNNER_ID=$(echo $NEW_RUNNER_ID | cut -c6-)
echo "$GITLAB_SECRET" | jq --arg key "runnerId" --arg val "$NEW_RUNNER_ID" '. + {($key): $val}' > newSecret.json
aws secretsmanager put-secret-value --secret-id $GITLAB_SECRET_NAME --secret-string file://newSecret.json
rm newSecret.json

echo ""
if [ $? -eq 0 ]; then
  echo "Secret $GITLAB_SECRET_NAME has been updated with runnerId \"$NEW_RUNNER_ID\""
else
  echo "FAILED to update Secret $GITLAB_SECRET_NAME with runnerId \"$NEW_RUNNER_ID\""
fi
