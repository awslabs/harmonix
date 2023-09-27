#!/usr/bin/env bash

# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

# This script has functions to empty S3 buckets for the application

# Delete all versioned files from the S3 bucket
# param1 the S3 bucket name
delete_versioned_files () {
    b=$1
    
    echo "  Start deleting all versions of all files..."
    
    versions=`aws s3api list-object-versions --bucket $b |jq '.Versions'`
    markers=`aws s3api list-object-versions --bucket $b |jq '.DeleteMarkers'`
    let count=`echo $versions |jq 'length'`-1
    echo ""
    echo "    version count: $(($count + 1))"
    
    if [ $count -gt -1 ]; then
        echo "    removing files"
        for i in $(seq 0 $count); do
            key=`echo $versions | jq .[$i].Key |sed -e 's/\"//g'`
            versionId=`echo $versions | jq .[$i].VersionId |sed -e 's/\"//g'`
            cmd="aws s3api delete-object --bucket $b --key $key --version-id $versionId"
            echo "      $cmd"
            $cmd
        done
    fi
    
    let count=`echo $markers |jq 'length'`-1
    echo ""
    echo "    delete marker count: $(($count + 1))"
    
    if [ $count -gt -1 ]; then
        echo "    removing delete markers"
        
        for i in $(seq 0 $count); do
            key=`echo $markers | jq .[$i].Key |sed -e 's/\"//g'`
            versionId=`echo $markers | jq .[$i].VersionId |sed -e 's/\"//g'`
            cmd="aws s3api delete-object --bucket $b --key $key --version-id $versionId"
            echo "      $cmd"
            $cmd
        done
    fi
    
    echo "  Finished deleting all versions of all files"
}

# Empty the supplied S3 bucket, including all file versions.
# param1: bucketName
empty_s3_bucket_by_name () {
    local bucketName=$1

    if [[ -z "$bucketName" ]]; then
        echo "ERROR: bucketName must be supplied as the first argument" >&2
        exit 1
    fi

    echo ""
    echo "Checking if \"$bucketName\" bucket exists..."
    aws s3api head-bucket --bucket "$bucketName"

    if [ $? -eq 0 ]; then
        echo "    \"$bucketName\" bucket exists"
    else
        echo "    \"$bucketName\" bucket does not exist"
        return 0
    fi

    echo ""
    echo "Starting to empty S3 bucket: \"$bucketName\"..."
    echo ""
    echo "  Start deleting all non-versioned files..."
    aws s3 rm s3://$bucketName --recursive
    if [[ $? == 0 ]]; then
        echo "  Success"
        echo ""
    else
        echo "  Failed"
        echo ""
    fi
    
    delete_versioned_files "$bucketName"
    if [[ $? == 0 ]]; then
        echo "  Success"
        echo ""
    else
        echo "  Failed"
        echo ""
    fi
    
    echo ""
    echo "Finished - emptying S3 bucket: \"$bucketName\""
}

if [[ -z "$1" ]]; then
    # print out the function names defined in this script
    echo USAGE: Pass one of these function names and its input parameter
    echo values as arguments to this script to execute it:
    declare -F | sed "s/declare -f//"
else
    # This allows you to call a function within this script from a
    # command prompt by passing in the name of the function and any
    # arguments to the function.
    "$@"
fi

