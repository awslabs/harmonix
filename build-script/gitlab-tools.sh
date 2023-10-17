#!/usr/bin/env bash

###########
# This file will attempt to create a repo and if it can't it will still 
# push backstage-reference to your gitlab repo
###########
echo "Pushing the reference repository to Gitlab - $SSM_GITLAB_HOSTNAME"
scriptDir=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
appDir=$scriptDir/..
configDir=${scriptDir}/../config

source ${configDir}/.env

GITLAB_TOKEN=$SECRET_GITLAB_CONFIG_PROP_apiToken

# Try to create a new project if one doesn't exist (will fail through)
curl -H "Content-Type:application/json" "https://$SSM_GITLAB_HOSTNAME/api/v4/projects?private_token=$GITLAB_TOKEN" -d "{ \"name\": \"backstage-reference\" ,  \"visibility\": \"internal\" }"

# Clean the temp directory if it exists to start from a blank slate
if [ -d "$appDir/git-temp" ]; then
  rm -rf $appDir/git-temp
fi
# Make tmp directory to add files that will be comitted to repo
mkdir -p $appDir/git-temp
echo -e "\nCloning from https://$SSM_GITLAB_HOSTNAME/opa-admin/backstage-reference.git\n"
git -C $appDir/git-temp clone -q "https://oauth2:$GITLAB_TOKEN@$SSM_GITLAB_HOSTNAME/opa-admin/backstage-reference.git"

# copy files to temp git repo
rsync -a --delete --exclude='**/node_modules' --exclude='**/cdk.out' --exclude='**/.git' $appDir/backstage-reference/ $appDir/git-temp/backstage-reference

rsync -a --delete --exclude='**/node_modules' --exclude='**/cdk.out' $appDir/iac/roots/{opa-common-constructs,opa-ecs-environment,opa-serverless-environment} $appDir/git-temp/backstage-reference/environments
\cp $appDir/iac/roots/package.json $appDir/git-temp/backstage-reference/environments


cd $appDir/git-temp/backstage-reference;

# Replace variable placeholders with env specific information
if [[ "$OSTYPE" == "darwin"* ]]; then
    find . -type f -name "*.yaml" -exec sed -i "" "s/{{ *gitlab_hostname *}}/$SSM_GITLAB_HOSTNAME/g" {} +; 
    find . -type f -name "*.yaml" -exec sed -i "" "s/{{ *aws-account *}}/$AWS_ACCOUNT_ID/g" {} +; 
else
    find . -type f -name "*.yaml" -exec sed -i "s/{{ *gitlab_hostname *}}/$SSM_GITLAB_HOSTNAME/g" {} +; 
    find . -type f -name "*.yaml" -exec sed -i "s/{{ *aws-account *}}/$AWS_ACCOUNT_ID/g" {} +; 
fi

# if the system is using git-defender and the repo is not configured, configure it
if command -v git-defender && ! grep -q "\[defender\]" .git/config ; then
  echo "Found git-defender, but repo is not configured.  Proceeding to configure repo for git-defender"
  (sleep 1; echo -e "y\n"; sleep 1; echo -e "y\n";)|git defender --setup
  echo ""
  echo ""
fi

# Add and commit changes to repo if there are files to commit
if [ -n "$(git status --porcelain=v1 2>/dev/null)" ]; then
  git add --all
  git commit --no-verify -m "Reference Commit"
  git push
else
  echo "No changes to commit."
fi
cd -
echo "Finished setting up the backstage reference repo."
