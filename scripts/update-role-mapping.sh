set -o pipefail # FAIL FAST
source ./scripts/helpers.sh
shopt -s expand_aliases

SECURITY_MAPPING_TABLE=baws-solution-securitymappingtableSecurityMappingTabletableF68716EF-ZPGYR7LN94GG
set_env
AWS_ACCOUNT_ID=$CURR_AWS_ACCOUNT
CURRENT_DATE=$(date "+%F")
aws dynamodb put-item --table-name $SECURITY_MAPPING_TABLE --item '{"id": {"S": "'$AWS_ACCOUNT_ID'-developers"}, "AuthProviderGroup": {"S": "developers"}, "IAMRole": {"S": "backstage-developers-role"}, "IAMRoleArn": {"S": "arn:aws:iam::'$AWS_ACCOUNT_ID':role/backstage-dev-role"}, "Relationship": {"S": "non-inherit"},"Account": {"S": "'$AWS_ACCOUNT_ID'"}, "createdAt": {"S": "'$CURRENT_DATE'"}}'
aws dynamodb put-item --table-name $SECURITY_MAPPING_TABLE --item '{"id": {"S": "'$AWS_ACCOUNT_ID'-qa"}, "AuthProviderGroup": {"S": "qa"}, "IAMRole": {"S": "backstage-qa-role"}, "IAMRoleArn": {"S": "arn:aws:iam::'$AWS_ACCOUNT_ID':role/backstage-qa-role"}, "Relationship": {"S": "non-inherit"},"Account": {"S": "'$AWS_ACCOUNT_ID'"}, "createdAt": {"S": "'$CURRENT_DATE'"}}'
aws dynamodb put-item --table-name $SECURITY_MAPPING_TABLE --item '{"id": {"S": "'$AWS_ACCOUNT_ID'-dev-ops"}, "AuthProviderGroup": {"S": "dev-ops"}, "IAMRole": {"S": "backstage-dev-role"}, "IAMRoleArn": {"S": "arn:aws:iam::'$AWS_ACCOUNT_ID':role/backstage-dev-ops-role"}, "Relationship": {"S": "non-inherit"},"Account": {"S": "'$AWS_ACCOUNT_ID'"}, "createdAt": {"S": "'$CURRENT_DATE'"}}'
aws dynamodb put-item --table-name $SECURITY_MAPPING_TABLE --item '{"id": {"S": "'$AWS_ACCOUNT_ID'-admins"}, "AuthProviderGroup": {"S": "admins"}, "IAMRole": {"S": "backstage-app-admin-role"}, "IAMRoleArn": {"S": "arn:aws:iam::'$AWS_ACCOUNT_ID':role/backstage-admins-role"}, "Relationship": {"S": "non-inherit"},"Account": {"S": "'$AWS_ACCOUNT_ID'"}, "createdAt": {"S": "'$CURRENT_DATE'"}}'

variable="TEST"

echo '{"id":{"S":"'$variable'"},"AuthProviderGroup":{"S":"test"},"IAMRole":{"S":"test"},"IAMRoleArn":{"S":"test"},"Relationship":{"S":"non-inherit"},"Account":{"S":"test"},"createdAt":{"S":"2023-03-21T14:03:25.239Z"}}'