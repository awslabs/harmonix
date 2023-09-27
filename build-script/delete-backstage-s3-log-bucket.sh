#!/usr/bin/env bash

# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

# This script empties the opa-platform-backstagenetworkopaplatformlogbucket-*
# S3 bucket.

bucketRegion=$1
: ${bucketRegion:=us-east-1}
RED='\033[0;31m'
NC='\033[0m' # No Color
scriptDir=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

buckets=$(aws s3api list-buckets --query "Buckets[?starts_with(Name, \`opa-platform-backstagenetworkopaplatformlogbucket-\`) == \`true\`].Name" --output text)

if [[ ! -z "$buckets" ]]; then
    for b in ${buckets[@]}
    do
        $scriptDir/empty-s3.sh empty_s3_bucket_by_name "$b"
        aws s3api delete-bucket --bucket "$b" --region $bucketRegion
    done
fi

