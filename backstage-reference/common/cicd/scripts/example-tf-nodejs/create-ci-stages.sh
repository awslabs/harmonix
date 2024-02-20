#!/usr/bin/env bash

scriptDir="$CI_PROJECT_DIR/.awsdeployment"
mkdir -p $scriptDir/jobs
mkdir -p $scriptDir/providers

echo "looking for providers in $scriptDir/providers"
ls -la $scriptDir/providers

for propsfile in $scriptDir/providers/*.properties
do
    [ -e "$propsfile" ] || continue
    set -a && source $propsfile && set +a
    
    echo "Processing Environment $TARGET_ENV_NAME, Provider $TARGET_ENV_PROVIDER_NAME"
    
    SIMPLE_STAGE_FILE_NAME=".gitlab-ci-$TARGET_ENV_NAME-$TARGET_ENV_PROVIDER_NAME.yml"
    STAGE_FILE_PATH="$scriptDir/jobs/$SIMPLE_STAGE_FILE_NAME"
    
    # Include the new jobs file for the environment provider if it has not
    # already been included
    
    LAST_NON_BLANK_LINE="$(tail -n 1 $CI_PROJECT_DIR/.gitlab-ci.yml)"
    if [[ -z "$LAST_NON_BLANK_LINE" ]]; then LAST_NON_BLANK_LINE="$(tail -n 2 $CI_PROJECT_DIR/.gitlab-ci.yml)"; fi
    
    # This block can create a new include if it is not already there
    # CURRENT_INCLUDE="$(echo "$LAST_NON_BLANK_LINE" | grep local:)"
    # if [[ -z "$CURRENT_INCLUDE" ]]; then
    #     echo -e "\ninclude:" >> $CI_PROJECT_DIR/.gitlab-ci.yml
    # fi
    
    INCLUDE_COUNT=$(grep -c "$SIMPLE_STAGE_FILE_NAME" $CI_PROJECT_DIR/.gitlab-ci.yml)
    
    if [[ "$INCLUDE_COUNT" -eq "0" ]]; then
        echo "  - local: .awsdeployment/jobs/$SIMPLE_STAGE_FILE_NAME" >> $CI_PROJECT_DIR/.gitlab-ci.yml
        echo "Updated $CI_PROJECT_DIR/.gitlab-ci.yml to include jobs for provider: ${TARGET_ENV_PROVIDER_NAME}"
    fi
    
    # Create bucket for state and resource group
    ENV_IDENTIFIER=$(echo "$PREFIX-$TARGET_ENV_PROVIDER_NAME-$APP_NAME" | tr '[:upper:]' '[:lower:]')
    # create a 6 char uniq identifier to append to the bucket name
    UNIQ_ID=$(LC_ALL=C tr -dc a-f0-9 </dev/urandom | head -c 6)
    # Ensure that the bucket name is unique across all environments and 63 characters or less
    STATE_BUCKET_NAME="opa-tf-state-${ENV_IDENTIFIER:0:42}-${UNIQ_ID}"
    echo "STATE_BUCKET_NAME for $TARGET_ENV_PROVIDER_NAME is $STATE_BUCKET_NAME"
    echo "s3 bucket will be created in the $REGION region"
    aws s3api head-bucket --bucket $STATE_BUCKET_NAME || BUCKET_NOT_EXIST=true
    if [ $BUCKET_NOT_EXIST ]; then
        echo "State bucket does not exist. creating..."
        export ROLE_NAME=$CI_PROJECT_NAME-$CI_JOB_STAGE # store role session name so that a single env var can be truncated to allowed character length
        ROLE_OUTPUT=$(aws sts assume-role --role-arn "$ENV_ROLE_ARN" --role-session-name "${ROLE_NAME:0:63}" --duration-second=3600 --output json)
        export AWS_ACCESS_KEY_ID=$(echo ${ROLE_OUTPUT} | jq -r '.Credentials.AccessKeyId')
        export AWS_SECRET_ACCESS_KEY=$(echo ${ROLE_OUTPUT} | jq -r '.Credentials.SecretAccessKey')
        export AWS_SESSION_TOKEN=$(echo ${ROLE_OUTPUT} | jq -r '.Credentials.SessionToken')
        aws sts get-caller-identity

        if [[ "$REGION" == "us-east-1" ]]; then
            aws s3api create-bucket --bucket $STATE_BUCKET_NAME --region $REGION
        else
            aws s3api create-bucket --bucket $STATE_BUCKET_NAME --region $REGION --create-bucket-configuration LocationConstraint=$REGION
        fi
        
        aws s3api put-bucket-tagging --bucket $STATE_BUCKET_NAME --region $REGION --tagging "TagSet=[{Key=aws-apps:$ENV_IDENTIFIER, Value=$APP_NAME}]"
        # Create DynamoDB state Table
        aws dynamodb create-table --region $REGION --table-name "terraform-state-$ENV_IDENTIFIER-lock" --attribute-definitions AttributeName=LockID,AttributeType=S --key-schema AttributeName=LockID,KeyType=HASH --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 --tags Key="aws-apps:$ENV_IDENTIFIER,Value=$APP_NAME" 
        # Adding state config to provider file
        echo "TFSTATE_BUCKET=$STATE_BUCKET_NAME" >> "$propsfile"
        echo "TFSTATE_REGION=$REGION" >> "$propsfile"
        echo "TFSTATE_DYNAMODB_TABLE=terraform-state-$ENV_IDENTIFIER-lock" >> "$propsfile"
    fi
    # Add pipeline stages for the environment if they have not already been set up
    
    ALREADY_HAS_STAGE="$(grep "prepare-$TARGET_ENV_NAME" $CI_PROJECT_DIR/.gitlab-ci.yml || true)"
    if [[ -z "$ALREADY_HAS_STAGE" ]]; then yq -Yi ".stages += [\"prepare-${TARGET_ENV_NAME}-stage\", \"${TARGET_ENV_NAME}-stage\"]" $CI_PROJECT_DIR/.gitlab-ci.yml; fi
    
    # Add GitLab jobs YAML file for the environment provider
    
    if [[ ! -f "$STAGE_FILE_PATH" ]]; then
        if [[ -z "$ADDED_STAGE" ]]; then
            ADDED_STAGE="$TARGET_ENV_NAME"
        elif [[ "$ADDED_STAGE" != "$TARGET_ENV_NAME" ]]; then
            ADDED_STAGE="MULTIPLE"
        fi
    fi

    rm $STAGE_FILE_PATH 2> /dev/null || true # regenerate all jobs files from scratch
    
    echo "iac-deployment-${TARGET_ENV_NAME}-${TARGET_ENV_PROVIDER_NAME}:" > $STAGE_FILE_PATH
    echo "  extends: .abstract-iac-deployment" >> $STAGE_FILE_PATH
    echo "  rules:" >> $STAGE_FILE_PATH
    echo "    - if: \"\$CI_COMMIT_TITLE =~ /generate CICD stages/\"" >> $STAGE_FILE_PATH
    echo "      when: never" >> $STAGE_FILE_PATH
    echo "    - if: \"\$CI_COMMIT_BRANCH == '$CI_DEFAULT_BRANCH'\"" >> $STAGE_FILE_PATH
    if [[ "$OPA_CI_ENVIRONMENT_MANUAL_APPROVAL"  == "true" ]]; then
        echo "      when: manual" >> $STAGE_FILE_PATH
    fi
    echo "      changes:" >> $STAGE_FILE_PATH
    echo "      - .iac/**/*" >> $STAGE_FILE_PATH
    echo "    - if: \"\$CI_COMMIT_TITLE =~ /Added CICD environment stage ${TARGET_ENV_NAME}/\"" >> $STAGE_FILE_PATH
    if [[ "$OPA_CI_ENVIRONMENT_MANUAL_APPROVAL"  == "true" ]]; then
        echo "      when: manual" >> $STAGE_FILE_PATH
    fi
    echo "    - if: \"\$CI_COMMIT_TITLE =~ /^Bind Resource to env ${TARGET_ENV_NAME}-${TARGET_ENV_PROVIDER_NAME}/\"" >> $STAGE_FILE_PATH
    if [[ "$OPA_CI_ENVIRONMENT_MANUAL_APPROVAL"  == "true" ]]; then
        echo "      when: manual" >> $STAGE_FILE_PATH
    fi
    echo "    - if: \"\$CI_COMMIT_TITLE =~ /^unBind Resource to env ${TARGET_ENV_NAME}-${TARGET_ENV_PROVIDER_NAME}/\"" >> $STAGE_FILE_PATH
    if [[ "$OPA_CI_ENVIRONMENT_MANUAL_APPROVAL"  == "true" ]]; then
        echo "      when: manual" >> $STAGE_FILE_PATH
    fi
    echo "    - if: \"\$CI_COMMIT_TITLE =~ /Added multiple environment stages/\"" >> $STAGE_FILE_PATH
    if [[ "$OPA_CI_ENVIRONMENT_MANUAL_APPROVAL"  == "true" ]]; then
        echo "      when: manual" >> $STAGE_FILE_PATH
    fi
    echo "  stage: prepare-${TARGET_ENV_NAME}-stage" >> $STAGE_FILE_PATH
    echo "  environment: ${TARGET_ENV_NAME}-${TARGET_ENV_PROVIDER_NAME}" >> $STAGE_FILE_PATH
    echo "  variables:" >> $STAGE_FILE_PATH
    echo "    PROVIDER_PROPS_FILE: .awsdeployment/providers/${TARGET_ENV_NAME}-${TARGET_ENV_PROVIDER_NAME}.properties" >> $STAGE_FILE_PATH
    echo ""  >> $STAGE_FILE_PATH
    
    echo "get-aws-creds-${TARGET_ENV_NAME}-${TARGET_ENV_PROVIDER_NAME}:" >> $STAGE_FILE_PATH
    if [[ "$OPA_CI_ENVIRONMENT_MANUAL_APPROVAL"  == "true" ]]; then
        echo "  extends: .abstract-get-aws-creds-manual" >> $STAGE_FILE_PATH
    else
        echo "  extends: .abstract-get-aws-creds-auto" >> $STAGE_FILE_PATH
    fi
    echo "  stage: ${TARGET_ENV_NAME}-stage" >> $STAGE_FILE_PATH
    echo "  environment: ${TARGET_ENV_NAME}-${TARGET_ENV_PROVIDER_NAME}" >> $STAGE_FILE_PATH
    echo "  variables:" >> $STAGE_FILE_PATH
    echo "    PROVIDER_PROPS_FILE: .awsdeployment/providers/${TARGET_ENV_NAME}-${TARGET_ENV_PROVIDER_NAME}.properties" >> $STAGE_FILE_PATH
    echo ""  >> $STAGE_FILE_PATH
    
    echo "build-image-${TARGET_ENV_NAME}-${TARGET_ENV_PROVIDER_NAME}:" >> $STAGE_FILE_PATH
    echo "  extends: .abstract-build-image" >> $STAGE_FILE_PATH
    echo "  needs:" >> $STAGE_FILE_PATH
    echo "    - get-aws-creds-${TARGET_ENV_NAME}-${TARGET_ENV_PROVIDER_NAME}" >> $STAGE_FILE_PATH
    echo "  stage: ${TARGET_ENV_NAME}-stage" >> $STAGE_FILE_PATH
    echo "  environment: ${TARGET_ENV_NAME}-${TARGET_ENV_PROVIDER_NAME}" >> $STAGE_FILE_PATH
    echo "  variables:" >> $STAGE_FILE_PATH
    echo "    PROVIDER_PROPS_FILE: .awsdeployment/providers/${TARGET_ENV_NAME}-${TARGET_ENV_PROVIDER_NAME}.properties" >> $STAGE_FILE_PATH
    echo ""  >> $STAGE_FILE_PATH

    # Deploy Container Image Job
    echo "deploy-image-${TARGET_ENV_NAME}-${TARGET_ENV_PROVIDER_NAME}:" >> $STAGE_FILE_PATH
    echo "  extends: .abstract-deploy-ecs-image" >> $STAGE_FILE_PATH
    echo "  needs:" >> $STAGE_FILE_PATH
    echo "    - build-image-${TARGET_ENV_NAME}-${TARGET_ENV_PROVIDER_NAME}" >> $STAGE_FILE_PATH
    echo "  stage: ${TARGET_ENV_NAME}-stage" >> $STAGE_FILE_PATH
    echo "  environment: ${TARGET_ENV_NAME}-${TARGET_ENV_PROVIDER_NAME}" >> $STAGE_FILE_PATH
    echo "  variables:" >> $STAGE_FILE_PATH
    echo "    PROVIDER_PROPS_FILE: .awsdeployment/providers/${TARGET_ENV_NAME}-${TARGET_ENV_PROVIDER_NAME}.properties" >> $STAGE_FILE_PATH
    echo "    BACKSTAGE_ENTITY_FILE: .backstage/catalog-info.yaml" >> $STAGE_FILE_PATH
    echo ""  >> $STAGE_FILE_PATH
        
    echo "delete-aws-creds-${TARGET_ENV_NAME}-${TARGET_ENV_PROVIDER_NAME}:" >> $STAGE_FILE_PATH
    echo "  extends: .abstract-delete-aws-creds" >> $STAGE_FILE_PATH
    echo "  needs:" >> $STAGE_FILE_PATH
    echo "    - build-image-${TARGET_ENV_NAME}-${TARGET_ENV_PROVIDER_NAME}" >> $STAGE_FILE_PATH
    echo "  stage: ${TARGET_ENV_NAME}-stage" >> $STAGE_FILE_PATH
    echo "  environment: ${TARGET_ENV_NAME}-${TARGET_ENV_PROVIDER_NAME}" >> $STAGE_FILE_PATH
    echo "  variables:" >> $STAGE_FILE_PATH
    echo "    PROVIDER_PROPS_FILE: .awsdeployment/providers/${TARGET_ENV_NAME}-${TARGET_ENV_PROVIDER_NAME}.properties" >> $STAGE_FILE_PATH
    echo ""  >> $STAGE_FILE_PATH
    
    git add $CI_PROJECT_DIR/.gitlab-ci.yml
    git add $STAGE_FILE_PATH
    git add $propsfile
    
done

UPDATE_COUNT=$(git diff --cached --numstat | wc -l | sed 's/ *$//g')
echo "The number of files that will be committed is $UPDATE_COUNT"
git status
if [[ "$UPDATE_COUNT" -gt "0" ]]; then
    if [[ "$ADDED_STAGE" == "MULTIPLE" ]]; then
        git commit -m "Added multiple environment stages" --quiet; 
    elif [[ ! -z "$ADDED_STAGE" ]]; then
        git commit -m "Added CICD environment stage ${ADDED_STAGE}" --quiet; 
    else
        git commit -m "Reprocessed CICD jobs. No new stages added." --quiet; 
    fi
fi
if [[ "$UPDATE_COUNT" -gt "0" ]]; then git push https://oauth2:$ACCESS_TOKEN@$CI_SERVER_HOST/$CI_PROJECT_NAMESPACE/$CI_PROJECT_NAME HEAD:main; fi
