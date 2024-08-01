#!/usr/bin/env bash

set -o pipefail # FAIL FAST
scriptDir=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
configDir=${scriptDir}/../config
source $scriptDir/helpers.sh
shopt -s expand_aliases

source ${configDir}/.env

# if AWS_ACCOUNT_ID is not set, ask for it
if [[ -z $AWS_ACCOUNT_ID ]]; then
  defaultAwsAccountNum=$(aws sts get-caller-identity --output text --query 'Account')
  aws_account_number AWS_ACCOUNT_ID "Enter the AWS account number to deploy to:" "$defaultAwsAccountNum"
fi
# if AWS_DEFAULT_REGION is not set, ask for it
if [[ -z $AWS_DEFAULT_REGION ]]; then
  defaultRegion=$( if [[ -n "${AWS_REGION}" ]]; then echo ${AWS_REGION}; else aws configure get region; fi )
  aws_region AWS_REGION "Enter the AWS region to deploy to:" "$defaultRegion"
fi

confirm_aws_account

# Set the desired count of the service to the first argument; otherwisee, the service will be scaled to 2
DESIRED_COUNT=${1:-2}

echo "Deploying the backstage backend container";
# TODO: proper versioning for build tag CODEBUILD_RESOLVED_SOURCE_VERSION identifier tag
DATE_TAG=$(date -u +%Y%m%d-%H%M)
BACKSTAGE_IMAGE_NAME=opa-backstage
docker tag ${BACKSTAGE_IMAGE_NAME}:latest ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com/${BACKSTAGE_IMAGE_NAME}:${DATE_TAG}
docker tag ${BACKSTAGE_IMAGE_NAME}:latest ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com/${BACKSTAGE_IMAGE_NAME}:latest
aws ecr get-login-password --region ${AWS_DEFAULT_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com/${BACKSTAGE_IMAGE_NAME}:${DATE_TAG}
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com/${BACKSTAGE_IMAGE_NAME}:latest

echo "Updating the ECS service to start 2 tasks"
$scriptDir/update-backstage-service-count.sh ${DESIRED_COUNT}
