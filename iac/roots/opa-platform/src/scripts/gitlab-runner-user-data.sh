# // Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# // SPDX-License-Identifier: Apache-2.0

exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

# function to wait for apt to finish and release all locks
apt_wait () {
  while sudo fuser /var/lib/dpkg/lock >/dev/null 2>&1 ; do
    echo "/var/lib/dpkg/lock is locked"
    sleep 10
  done
  while sudo fuser /var/lib/apt/lists/lock >/dev/null 2>&1 ; do
    echo "/var/lib/apt/lists/lock is locked"
    sleep 10
  done
  if [ -f /var/log/unattended-upgrades/unattended-upgrades.log ]; then
    while sudo fuser /var/log/unattended-upgrades/unattended-upgrades.log >/dev/null 2>&1 ; do
      echo "/var/log/unattended-upgrades/unattended-upgrades.log is locked"
      sleep 10
    done
  fi
}

# Perform update - required so that jq/unzip packages are available
echo ""
echo "Updating APT..."
apt_wait
apt-get update
echo ""
echo "DONE Updating APT"
echo ""
echo "Installing jq, unzip, and aws cli v2..."
echo ""
apt_wait
apt-get install jq unzip -y
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
echo "Unzipping AWS CLI..."
unzip -q awscliv2.zip
echo -e "\nDone unzipping AWS CLI\n"
echo "Installing AWS CLI..."
./aws/install 1> /dev/null
echo -e "\nDone installing AWS CLI\n"
echo ""
echo "DONE Installing jq, unzip, and aws cli v2"
echo ""

echo ""
echo "Getting runner registration parameters"
GITLAB_URL=`aws ssm get-parameter --name "/opa/gitlab-url" --output text --query Parameter.Value --with-decryption`
echo "GITLAB_URL is \"$GITLAB_URL\""
GITLAB_SECRET_NAME=opa-admin-gitlab-secrets
echo "GITLAB_SECRET_NAME is \"$GITLAB_SECRET_NAME\""

if [[ -z "$GITLAB_URL" ]]; then
  echo "FAILED to get GITLAB_URL. GitLab runner cannot be registered."
  exit 1
fi

# Install Docker
echo "Installing Docker"
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
echo ""
echo "DONE Installing Docker"

# Download and install GitLab Runner
echo ""
echo "Downloading GitLab Runner"
# Freeze the GitLab Runner version to 16.5.0
# sudo curl -L --output /usr/local/bin/gitlab-runner "https://gitlab-runner-downloads.s3.amazonaws.com/v16.5.0/binaries/gitlab-runner-linux-386"
sudo curl -L --output /usr/local/bin/gitlab-runner "https://gitlab-runner-downloads.s3.amazonaws.com/latest/binaries/gitlab-runner-linux-386"
sudo chmod +x /usr/local/bin/gitlab-runner
echo ""
echo "DONE Downloading GitLab Runner"

# Create GitLab CI User
echo ""
echo "Creating GitLab CI User"
sudo useradd --comment 'GitLab Runner' --create-home gitlab-runner --shell /bin/bash
echo "DONE Creating GitLab CI User"

# Install GitLab Runner and start the service
echo ""
echo "Installing GitLab Runner"
sudo gitlab-runner install --user=gitlab-runner --working-directory=/home/gitlab-runner
sudo gitlab-runner start
echo "DONE Installing GitLab Runner"

# loop 1000 times, increment i by 1
for i in {1..1001..1}
do
  echo ""
  echo "Looking up secret value for \"$GITLAB_SECRET_NAME\""
  GITLAB_SECRET=$(aws secretsmanager get-secret-value --secret-id $GITLAB_SECRET_NAME | jq --raw-output '.SecretString')
  
  GITLAB_SECRET_TOKEN=$(echo $GITLAB_SECRET | jq -r .apiToken)
  RUNNER_ID=$(echo $GITLAB_SECRET | jq -r .runnerId)
  RUNNER_TOKEN=$(echo $GITLAB_SECRET | jq -r .runnerRegistrationToken)
  PAT=$(echo $GITLAB_SECRET | jq -r .PAT)
  RUNNER_URL="${GITLAB_URL}/"

  echo $GITLAB_SECRET
  echo "RUNNER_URL is $RUNNER_URL"
  echo "PAT is $PAT"
  
  # if [[ -z "$RUNNER_TOKEN" ]]; then
  #   echo "Runner registration token was not yet found in the secret."
  #   echo "Cannot register GitLab Runner YET."
  #   echo "Sleeping for 20 seconds"
  #   sleep 20
  if [[ -z "$PAT" ]] || [[ "$PAT" == "null" ]]; then
    echo "Runner PAT was not yet found in the secret."
    echo "Cannot register GitLab Runner YET."
    echo "Sleeping for 20 seconds"
    sleep 20
  else

    # if [[ -z "$RUNNER_ID" ]]; then
    #   echo "No prior runner ID has been set."
    # else
    #   echo "Attempting to deregister prior GitLab Runner $RUNNER_ID"
    #   curl --request DELETE --header "PRIVATE-TOKEN: $GITLAB_SECRET_TOKEN" "${GITLAB_URL}/api/v4/runners/${RUNNER_ID}"
    # fi

    # ******Registring the runner using PAT******
    echo "Registering GitLab Runner PAT"
    echo "Using PAT: $PAT"
    # echo "Sleeping 1 min"
    # sleep 60
    echo "Getting auth token to regiser runner..."
    AUTH_TOKEN_RESP=$(curl --request POST --header "PRIVATE-TOKEN: $PAT" --data "runner_type=instance_type" "${GITLAB_URL}/api/v4/user/runners")
    echo $AUTH_TOKEN_RESP
    AUTH_TOKEN=$(echo $AUTH_TOKEN_RESP | jq -r .token)
    echo $AUTH_TOKEN

    sudo gitlab-runner register \
    --non-interactive \
    --url $RUNNER_URL  \
    --token $AUTH_TOKEN \
    --executor "docker" \
    --docker-image docker:20.10.16 \
    --description "EC2 Gitlab Runner with Docker Executor"
    # ****** End of Registring the runner using PAT******

    echo ""
    echo "Registering GitLab Runner"
    # sudo gitlab-runner register \
    # --non-interactive \
    # --url $RUNNER_URL \
    # --registration-token $RUNNER_TOKEN \
    # --description "EC2 Gitlab Runner with Docker Executor" \
    # --run-untagged=true \
    # --executor docker \
    # --docker-tlsverify=false \
    # --docker-image docker:20.10.16 \
    # --docker-privileged=true \
    # --docker-disable-cache=false \
    # --docker-volumes "/certs/client"

    # Set the runner ID into the secret
    prefix="id = "
    NEW_RUNNER_ID=$(grep "$prefix" /etc/gitlab-runner/config.toml)
    NEW_RUNNER_ID=$(echo $NEW_RUNNER_ID | cut -c6-)

    if [[ -z "$NEW_RUNNER_ID" ]]; then
      echo "FAILED to get new runner ID"
    else
      echo "NEW_RUNNER_ID is \"$NEW_RUNNER_ID\""
      echo "$GITLAB_SECRET" | jq --arg key "runnerId" --arg val "$NEW_RUNNER_ID" '. + {($key): $val}' > newSecret.json
      echo "Saving GitLab Runner ID into secret: $GITLAB_SECRET_NAME"
      aws secretsmanager put-secret-value --secret-id $GITLAB_SECRET_NAME --secret-string file://newSecret.json
      rm newSecret.json

      echo ""
      if [ $? -eq 0 ]; then
        echo "Secret $GITLAB_SECRET_NAME has been updated with runnerId \"$NEW_RUNNER_ID\""
      else
        echo "FAILED to update Secret $GITLAB_SECRET_NAME with runnerId \"$NEW_RUNNER_ID\""
      fi
    fi

    # Stop the for loop
    break

  fi

done
