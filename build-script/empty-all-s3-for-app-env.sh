#!/usr/bin/env bash

# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

# This script searches an AWS account to find all S3 buckets that are dedicated
# to the current application environment EXCEPT FOR buckets that include 
# "tf-back-end" in their name. The search relies upon a bucket naming convention
# where the bucket names all start with "<APP_NAME>-<ENV_NAME>-". 
#
# All buckets found by the search will be emptied completely. Run this script
# in interactive mode to see the list of buckets that will be emptied so that
# you can choose whether or not to proceed with the emptying process.
#
# Script Arguments
#   arg1: The script mode. Optional. Defaults to "interactive". Set to "headless"
#         if you do not want an interactive confirmation prompt

mode=$1
RED='\033[0;31m'
NC='\033[0m' # No Color
scriptDir=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

if [[ -z "$APP_NAME" ]]; then
    echo -e "${RED} ERROR: The APP_NAME environment variable must be set.${NC}" >&2
    exit 1
fi

if [[ -z "$ENV_NAME" ]]; then
    echo -e "${RED} ERROR: The ENV_NAME environment variable must be set.${NC}" >&2
    exit 1
fi

if [[ -z "$mode" ]]; then
    mode="interactive"
fi

buckets=$(aws s3api list-buckets --query "Buckets[?starts_with(Name, \`$APP_NAME-\`) == \`true\`]|[?contains(Name, \`-$ENV_NAME-\`) == \`true\`]|[?contains(Name, \`tf-back-end\`) == \`false\`].Name" --output text)

echo "Buckets that will be emptied:"
for b in ${buckets[@]}
do
  echo "  $b"
done

echo ""
if [[ "$mode" == "interactive" ]]; then
    read -p "Are you sure you want to delete all files from these buckets (y/n)? " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        [[ "$0" = "$BASH_SOURCE" ]] && exit 1 || return 1 # handle exits from shell or function but don't exit interactive shell
    fi
fi

for b in ${buckets[@]}
do
    $scriptDir/empty-s3.sh empty_s3_bucket_by_name "$b"
done
