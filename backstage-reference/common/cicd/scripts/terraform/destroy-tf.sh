cd $CI_PROJECT_DIR/.awsdeployment
set -a && source env-destroy-params-temp.properties && set +a
git rm env-destroy-params-temp.properties
echo "Processing Env to Remove $PROVIDER_FILE_TO_DELETE"
set -a && source "providers/$PROVIDER_FILE_TO_DELETE" && set +a
sed -e 's/^/TF_VAR_/' providers/$PROVIDER_FILE_TO_DELETE > updated_props.properties
cat updated_props.properties
set -a && source updated_props.properties && set +a
cd $CI_PROJECT_DIR/.iac/
export ROLE_NAME=$CI_PROJECT_NAME-$CI_JOB_STAGE # store role session name so that a single env var can be truncated to allowed character length
ROLE_OUTPUT=$(aws sts assume-role --role-arn "$ENV_ROLE_ARN" --role-session-name "${ROLE_NAME:0:63}" --duration-second=3600 --output json)
export AWS_ACCESS_KEY_ID=$(echo ${ROLE_OUTPUT} | jq -r '.Credentials.AccessKeyId')
export AWS_SECRET_ACCESS_KEY=$(echo ${ROLE_OUTPUT} | jq -r '.Credentials.SecretAccessKey')
export AWS_SESSION_TOKEN=$(echo ${ROLE_OUTPUT} | jq -r '.Credentials.SessionToken')
aws sts get-caller-identity
terraform -v
terraform init -backend-config="bucket=${TFSTATE_BUCKET}" -backend-config="region=${TFSTATE_REGION}"  -backend-config="dynamodb_table=${TFSTATE_DYNAMODB_TABLE}" 
terraform destroy -auto-approve
# Update Entity
cd $CI_PROJECT_DIR/.backstage
ALREADY_DEPENDS_ON="$(grep "$ENV_ENTITY_REF" catalog-info.yaml || true)"
if ! [[ -z "$ALREADY_DEPENDS_ON" ]]; then yq -Yi "del(.spec.dependsOn[] | select(. ==\"${ENV_ENTITY_REF}\"))" catalog-info.yaml; fi
cat catalog-info.yaml
git add $CI_PROJECT_DIR/.backstage/catalog-info.yaml
git add catalog-info.yaml

UPDATE_COUNT=$(git diff --cached --numstat | wc -l | sed 's/ *$//g')
echo "The number of files that will be committed is $UPDATE_COUNT"
git status
if [[ "$UPDATE_COUNT" -gt "0" ]]; then git commit -m "Removed Provider ${TARGET_ENV_NAME}-${TARGET_ENV_PROVIDER_NAME}" --quiet; fi
if [[ "$UPDATE_COUNT" -gt "0" ]]; then git push -o ci.skip https://oauth2:$ACCESS_TOKEN@$CI_SERVER_HOST/$CI_PROJECT_NAMESPACE/$CI_PROJECT_NAME HEAD:main; fi
