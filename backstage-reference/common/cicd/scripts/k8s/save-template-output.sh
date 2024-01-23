#!/usr/bin/env bash

# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

# Loop over all current environments and resolve template output

gitAddResolvedTemplateSetting="$1"
d="$2"

echo "Saving Resolved Template Output"
echo "gitAddResolvedTemplateSetting set to $gitAddResolvedTemplateSetting"
echo "directory to process is $d"

imageSearch="${EcrRepositoryUri/\//\\/}:.*"
imageReplace="${EcrRepositoryUri/\//\\/}:$CI_COMMIT_SHORT_SHA"

cd $CI_PROJECT_DIR/$K8S_CONFIG_DIR

# Loop over all current environments and save template engine output
# (for d in */ ; do 
#   if [[ -d "$d" && ! -L "$d" && "$d" != "base/" && "$d" != "new-env-template/" ]]; then

    providerPropsFile=$CI_PROJECT_DIR/.awsdeployment/providers/${d%%/*}.properties
    echo "using provider props file: $providerPropsFile"
    source $providerPropsFile
    echo "performing variable replacement before running template engine"
    $CI_PROJECT_DIR/cicd/scripts/k8s/resolve-placeholders.sh ${d%%/*}

    echo "creating resolved template output for ${d%%/*}"
    
    if [[ -f "$d/values.yaml" ]]; then
      helm template -f $d/values.yaml . > $d/next-release.yaml
      cat $d/next-release.yaml
      cd $d
    else
      cd $d
      kubectl kustomize > next-release.yaml
      cat next-release.yaml
    fi
    
    if [ $? -ne 0 ]; then
      exit 1
    fi
    if [[ "$gitAddResolvedTemplateSetting" != "skipGitAddTemplateOutput" ]]; then
      # Updating the ECR image to use the latest Git short hash
      echo "updating manifest's container image - from \"$imageSearch\" to \"$imageReplace\""
      sed -i "s/$imageSearch/$imageReplace/g" next-release.yaml
      git add next-release.yaml
    fi
    echo "Converting next-release.yaml to next-release.json"
    yq -s . next-release.yaml > next-release.json;
    if [ $? -ne 0 ]; then
      exit 1
    fi
    if [[ "$gitAddResolvedTemplateSetting" != "skipGitAddTemplateOutput" ]]; then
      git add next-release.json
    fi
    cd -

    # reset kustomize base files to prepare to process subsequent providers
    if [[ -d "$CI_PROJECT_DIR/$K8S_CONFIG_DIR/base" ]]; then
      git restore $CI_PROJECT_DIR/$K8S_CONFIG_DIR/base/*
    fi
    

#   fi; 
# done)

if [ $? -ne 0 ]; then
  exit 1
fi

cd -
