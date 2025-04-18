#!/usr/bin/env bash

# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

# This script is useful for running Backstage (with Harmonix on AWS plugins) on a local developer machine, as opposed
# to hosting Backstage on the AWS cloud. This script tries to assume the same AWS IAM role that the hosted Harmomix 
# system would. When you run Backstage locally, it will use whatever role you are currently logged in as in your 
# shell. That role needs to have appropriate permissions so that Harmonix can function properly.

# Note: since Harmonix was created to interact with AWS, it still needs resources running on AWS, even when you
# run Backstage on a local developer machine.

# Usage ./build-script/local-backstage-role-assumption.sh <mode>
# the "mode" argument can be ommitted but can be set to "debug" to start Backstage in debug mode

# Prerequisites: 
#   * make sure that you are logged in with the AWS CLI into the AWS account that you set AWS_ACCOUNT_ID to in config/.env
#   * the role that you are logged in with must have permissions to assume the Harmonix system role:
#     "Effect": "Allow",
#     "Action": "sts:AssumeRole",
#     "Resource": "arn:aws:iam::<AWS_ACCOUNT_ID>:role/backstage-master-role"

set +u # don't throw an error on referencing unbound variables
scriptDir=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
source $scriptDir/helpers.sh

# Save the current user's profile ARN in case the trust policy needs to be updated
CURRENT_ROLE_ARN=$(aws sts get-caller-identity --output text --query 'Arn') || { echo -e "\nERROR: please log into the AWS CLI before proceeding.\n"; exit 1; }
# if we didn't get a role ARN, then exit since we won't be able to do much of anything
if [[ -z "$CURRENT_ROLE_ARN" ]]; then
  echo "Current role could not be determined.  No further actions will be possible."
  echo "Ensure that your environment is set up correctly for AWS access and try again."
  exit 1
fi

# first, "clean up" any previously set "AWS_" env vars and reset to your preferred profile
# See https://docs.aws.amazon.com/cli/v1/userguide/cli-configure-files.html for more info.
unset AWS_ACCOUNT && unset AWS_SESSION_TOKEN && unset AWS_ACCESS_KEY_ID && unset AWS_SECRET_ACCESS_KEY

confirm_aws_account

# next, assume the Harmonix system role
AWS_ACCOUNT=$(aws sts get-caller-identity --query "Account" --output text)

echo "Proceeding with AWS_ACCOUNT=${AWS_ACCOUNT}. Attempting to assume the Harmonix system role."
ROLE_OUTPUT=$(aws sts assume-role --role-arn "arn:aws:iam::${AWS_ACCOUNT}:role/backstage-master-role" --role-session-name "localTestUser-${AWS_ACCOUNT}" --duration-second=3600 --output json) > /dev/null || echo -e "\nError assuming the Harmonix system role."
# echo ROLE_OUTPUT=$ROLE_OUTPUT

if [[ -z "$ROLE_OUTPUT" ]]; then
  echo -e "\nProceeding to add current user/role to Harmonix system role trust policy"
  # Get the trust policy for backstage-master-role
  ROLE_TRUST_POLICY=$(aws iam get-role --role-name backstage-master-role --query 'Role.AssumeRolePolicyDocument' --output json)
  NEW_TRUST_POLICY=$(echo ${ROLE_TRUST_POLICY} | jq -c ".Statement[0].Principal.AWS=\"${CURRENT_ROLE_ARN}\"") # | jq -R .)

  eval $(aws iam update-assume-role-policy --role-name backstage-master-role --policy-document ${NEW_TRUST_POLICY})

  # sleep for a few seconds to allow the trust policy to propagate
  echo "Sleeping for 10 seconds to allow trust policy propagation"
  sleep 10

  ROLE_OUTPUT=$(aws sts assume-role --role-arn "arn:aws:iam::${AWS_ACCOUNT}:role/backstage-master-role" --role-session-name "localTestUser-${AWS_ACCOUNT}" --duration-second=3600 --output json)
fi

echo -e "\nUnsetting AWS_PROFILE env var and configuring AWS CLI session to use the Harmonix system role temporary credentials\n"
export AWS_ACCESS_KEY_ID=$(echo ${ROLE_OUTPUT} | jq -r '.Credentials.AccessKeyId')
export AWS_SECRET_ACCESS_KEY=$(echo ${ROLE_OUTPUT} | jq -r '.Credentials.SecretAccessKey')
export AWS_SESSION_TOKEN=$(echo ${ROLE_OUTPUT} | jq -r '.Credentials.SessionToken')
unset AWS_PROFILE

# optionally, verify that you're running under the correct Harmonix system role
export HARMONIX_PROCESS_ROLE_ARN="$(aws sts get-caller-identity --output text --query 'Arn')"

# now, you can start backstage locally. CAVEAT - chained, assumed roles can only have a 1-hr max duration.  You have to re-run through the steps above each hour :(
echo "Starting backstage locally with role assumption of ${HARMONIX_PROCESS_ROLE_ARN}"
echo -e "Note: if your AWS CLI session expires, kill the locally-running backstage process and run this script again to refresh your session.\n"

if [[ "${1:-default}" == "debug" ]]; then
  make stop-local start-local-debug
else
  make stop-local start-local
fi