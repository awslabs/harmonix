# Usage ./scripts/role-assumptions.sh {PROFILE_NAME}

# Pre-req: make sure that you've run `mwinit --aea` to get your midway stuff set up

# first, "clean up" any previously set "AWS_" env vars and reset to your preferred profile
unset AWS_ACCOUNT && unset AWS_SESSION_TOKEN && unset AWS_ACCESS_KEY_ID && unset AWS_SECRET_ACCESS_KEY && export AWS_PROFILE=$1

# next, assume the master role
AWS_ACCOUNT=$(aws sts get-caller-identity --query "Account" --output text) && ROLE_OUTPUT=$(aws sts assume-role --role-arn "arn:aws:iam::${AWS_ACCOUNT}:role/backstage-master-role" --role-session-name "localTestUser-${AWS_ACCOUNT}" --duration-second=3600 --output json) && export AWS_ACCESS_KEY_ID=$(echo ${ROLE_OUTPUT} | jq -r '.Credentials.AccessKeyId') && export AWS_SECRET_ACCESS_KEY=$(echo ${ROLE_OUTPUT} | jq -r '.Credentials.SecretAccessKey') && export AWS_SESSION_TOKEN=$(echo ${ROLE_OUTPUT} | jq -r '.Credentials.SessionToken') && unset AWS_PROFILE

# optionally, verify that you're running under the correct backstage-master-role
aws sts get-caller-identity

# now, you can start backstage locally.  CAVEAT - chained, assumed roles can only have a 1-hr max duration.  You have to re-run through the steps above each hour :(
make stop-local start-local