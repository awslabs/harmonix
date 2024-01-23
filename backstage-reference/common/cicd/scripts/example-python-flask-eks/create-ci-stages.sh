#!/usr/bin/env bash

scriptDir="$CI_PROJECT_DIR/.awsdeployment"
mkdir -p $scriptDir/jobs
mkdir -p $scriptDir/providers
mkdir -p $scriptDir/permissions

$CI_PROJECT_DIR/cicd/scripts/k8s/install-kubectl.sh

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
    
    # Run IaC Job
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
    
    # Get AWS Creds Job
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
    
    # Build Container Image Job
    echo "build-image-${TARGET_ENV_NAME}-${TARGET_ENV_PROVIDER_NAME}:" >> $STAGE_FILE_PATH
    echo "  extends: .abstract-build-image" >> $STAGE_FILE_PATH
    echo "  needs:" >> $STAGE_FILE_PATH
    echo "    - get-aws-creds-${TARGET_ENV_NAME}-${TARGET_ENV_PROVIDER_NAME}" >> $STAGE_FILE_PATH
    echo "  stage: ${TARGET_ENV_NAME}-stage" >> $STAGE_FILE_PATH
    echo "  environment: ${TARGET_ENV_NAME}-${TARGET_ENV_PROVIDER_NAME}" >> $STAGE_FILE_PATH
    echo "  variables:" >> $STAGE_FILE_PATH
    echo "    PROVIDER_PROPS_FILE: .awsdeployment/providers/${TARGET_ENV_NAME}-${TARGET_ENV_PROVIDER_NAME}.properties" >> $STAGE_FILE_PATH
    echo ""  >> $STAGE_FILE_PATH
    
    echo "git-commit-${TARGET_ENV_NAME}-${TARGET_ENV_PROVIDER_NAME}:" >> $STAGE_FILE_PATH
    echo "  extends: .abstract-git-commit" >> $STAGE_FILE_PATH
    echo "  needs:" >> $STAGE_FILE_PATH
    echo "    - build-image-${TARGET_ENV_NAME}-${TARGET_ENV_PROVIDER_NAME}" >> $STAGE_FILE_PATH
    echo "  stage: ${TARGET_ENV_NAME}-stage" >> $STAGE_FILE_PATH
    echo "  environment: ${TARGET_ENV_NAME}-${TARGET_ENV_PROVIDER_NAME}" >> $STAGE_FILE_PATH
    echo "  variables:" >> $STAGE_FILE_PATH
    echo "    PROVIDER_PROPS_FILE: .awsdeployment/providers/${TARGET_ENV_NAME}-${TARGET_ENV_PROVIDER_NAME}.properties" >> $STAGE_FILE_PATH
    echo ""  >> $STAGE_FILE_PATH
    
    git add $CI_PROJECT_DIR/.gitlab-ci.yml
    git add $STAGE_FILE_PATH

    export K8S_CONFIG_DIR=$(yq -r .metadata.k8sConfigDirName $CI_PROJECT_DIR/.backstage/catalog-info.yaml)
    
    if [[ ! -d "$CI_PROJECT_DIR/$K8S_CONFIG_DIR/$TARGET_ENV_NAME-$TARGET_ENV_PROVIDER_NAME" ]]; then

        if [[ -f "$CI_PROJECT_DIR/$K8S_CONFIG_DIR/Chart.yaml" ]]; then
            export IS_HELM="true"
            export IS_KUSTOMIZE="false"
        else
            export IS_HELM="false"
            export IS_KUSTOMIZE="true"
        fi

        if [[ "$IS_HELM" == "true" ]]; then
            $CI_PROJECT_DIR/cicd/scripts/k8s/install-helm.sh
        fi

        echo -e "\e[0Ksection_start:`date +%s`:k8s-config[collapsed=true]\r\e[0KCreate k8s Configs for Environment"
        newK8sEnvDir="$CI_PROJECT_DIR/$K8S_CONFIG_DIR/$TARGET_ENV_NAME-$TARGET_ENV_PROVIDER_NAME"
        
        if [[ "$IS_HELM" == "true" ]]; then
            mkdir $newK8sEnvDir
            cp $CI_PROJECT_DIR/$K8S_CONFIG_DIR/values.yaml $newK8sEnvDir
        elif [[ "$IS_KUSTOMIZE" == "true" ]]; then
            cp -r $CI_PROJECT_DIR/$K8S_CONFIG_DIR/new-env-template/ $newK8sEnvDir
        fi
        
        $CI_PROJECT_DIR/cicd/scripts/k8s/save-template-output.sh "skipGitAddTemplateOutput" "$TARGET_ENV_NAME-${TARGET_ENV_PROVIDER_NAME}/" || exit 1
        git add $newK8sEnvDir

        # Do not add these files to git since they will contain unresolved variables
        # that we cannot resolve until after the app image has been built
        git reset $newK8sEnvDir/next-release.yaml
        git reset $newK8sEnvDir/next-release.json

        echo -e "\e[0Ksection_end:`date +%s`:k8s-config\r\e[0K"
    else
        echo "Skipping creating k8s environment directory $CI_PROJECT_DIR/$K8S_CONFIG_DIR/$TARGET_ENV_NAME-$TARGET_ENV_PROVIDER_NAME since it already exists"
    fi

done

echo -e "\e[0Ksection_start:`date +%s`:git[collapsed=true]\r\e[0KUpdate Git Repo"
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
echo -e "\e[0Ksection_end:`date +%s`:git\r\e[0K"
