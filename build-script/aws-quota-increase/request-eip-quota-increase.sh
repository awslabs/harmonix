#!/usr/bin/env bash

# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

# This script will make a request through the AWS CLI to increase
# the maximum allowed elastic ip addresses for an AWS account in
# a specific region.
# Script Arguments
#   arg1: the maximum allowed elastic ip addresses for the AWS account in
#         a specific region.
#   arg2: the AWS region.
#   arg3: The script mode. Optional. Defaults to "interactive". Set to "headless"
#         if you do not want an interactive confirmation prompt

RED='\033[0;31m'
NC='\033[0m' # No Color
newValue=$1
region=$2
mode=$3

if [[ -z "$newValue" ]]; then
    echo -e "${RED} ERROR: The desired number for the maximum allowed EIPs must be passed as the first argument to this script.${NC}" >&2
    exit 1
fi

if [[ -z "$region" ]]; then
    echo -e "${RED} ERROR: The affected AWS account region must be passed as the second argument to this script.${NC}" >&2
    exit 1
fi

if [[ -z "$mode" ]]; then
    mode="interactive"
fi

if ! command -v jq --version &> /dev/null
then
    echo -e "${RED} ERROR: jq could not be found. Please install jq, then run this script again.${NC}" >&2
    exit 1
fi

cliAccountId=$(aws sts get-caller-identity --query Account --output text)

if [[ -z "$cliAccountId" ]]; then
    echo -e "${RED} ERROR: Unable to detect AWS account number. Please configure the AWS CLI and try again.${NC}" >&2
    exit 1
fi

if [[ "$mode" == "interactive" ]]; then
    read -p "You are about to request an elastic IP quota increase to $newValue for account $cliAccountId in region $region. Do you want to proceed (y/n)? [n] " proceed

    if [[ "$proceed" != "y" ]] && [[ "$proceed" != "Y" ]]; then
        exit 0
    fi
fi

echo ""
echo "Requesting elastic IP quota increase to $newValue for account $cliAccountId in region $region..."

aws service-quotas request-service-quota-increase \
    --service-code ec2 \
    --quota-code L-0263D0A3 \
    --desired-value $newValue \
    --region $region

echo "DONE"
echo "Note - this request should be automatically approved within approximately 15 minutes."
echo ""
