#!/usr/bin/env bash

# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

# loop over yaml files and replace placeholder values with environment variables

echo ""
echo "Provider Replacement Variables:"
echo "  ACCT_PLACEHOLDER=\"$ACCOUNT\""
echo "  NS_PLACEHOLDER=\"$NAMESPACE\""
echo "  PREFIX_PLACEHOLDER=\"$PREFIX\""
echo "  REGION_PLACEHOLDER=\"$REGION\""
echo "  ENV_PLACEHOLDER=\"$TARGET_ENV_NAME\""
echo "  ENV_PROVIDER_PLACEHOLDER=\"$TARGET_ENV_PROVIDER_NAME\""
echo ""
echo "App Replacement Variables:"
echo "  SA_ROLE_PLACEHOLDER=\"$ServiceAccountRoleArn\""
echo "  APP_ADMIN_ROLE_PLACEHOLDER=\"$AppAdminRoleArn\""
echo ""

echoerr() { echo "$@" 1>&2; }

if [[ -z "$NAMESPACE" ]]; then
    echoerr "ERROR: Missing environment variable value for NS_PLACEHOLDER"
fi

performReplacement () {
    local k8sYamlDir=$1
    for filename in $k8sYamlDir/*.yaml; do
        echo "found yaml file in $k8sYamlDir: $filename"
        sed -i "s|NS_PLACEHOLDER|$NAMESPACE|g" $filename
        sed -i "s|ENV_PLACEHOLDER|$TARGET_ENV_NAME|g" $filename
        sed -i "s|ENV_PROVIDER_PLACEHOLDER|$TARGET_ENV_PROVIDER_NAME|g" $filename
        sed -i "s|PREFIX_PLACEHOLDER|$PREFIX|g" $filename
        sed -i "s|ACCT_PLACEHOLDER|$ACCOUNT|g" $filename
        sed -i "s|REGION_PLACEHOLDER|$REGION|g" $filename

        # Conditional replacements. Leave the placeholder alone if we don't
        # have a replacement value yet
        if [[ ! -z "$ServiceAccountRoleArn" ]]; then
            sed -i "s|SA_ROLE_PLACEHOLDER|$ServiceAccountRoleArn|g" $filename
        fi
        if [[ ! -z "$AppAdminRoleArn" ]]; then
            sed -i "s|APP_ADMIN_ROLE_PLACEHOLDER|$AppAdminRoleArn|g" $filename
        fi
        
    done
}

performReplacement "$1"

curDir=${1##*/}
if [[ "$curDir" != "base" && -d "$1/../base" ]]; then
    cd "$1/../base"
    baseDir="$(pwd)"
    performReplacement "$baseDir"
    cd -
fi
