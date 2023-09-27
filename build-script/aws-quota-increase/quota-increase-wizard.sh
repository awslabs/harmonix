#!/usr/bin/env bash

# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

# This script provides an interactive wizard for you to find
# service quotas and request increases.

# Asks a question with a default answer and will not return the 
# answer until it matches the supplied regex
# param1: the name of the variable to set using the Bash nameref feature
# param2: the question to ask
# param3: the default answer to the question
# param4: the regex pattern to match
# param5: the error message to show if the pattern does not match
get_answer () {
    local -n answer=$1
    local question=$2
    local defaultAnswer=$3
    local pattern=$4
    local msg=$5
    local defaultOptionString
    [ -z "$defaultAnswer" ] && defaultOptionString="" || defaultOptionString="[$defaultAnswer] "

    while true
    do
        read -p "$question $defaultOptionString" answer
        answer="${answer:=$defaultAnswer}"
        # echo "Answer was \"$answer\"" >&2   # This is useful for debugging
        [[ $answer =~ $pattern ]] && return 0
        echo $msg >&2
    done
}

# Asks a yes or no question with a default answer and will not return the 
# answer until it is either y or n
# param1: the name of the variable to set using the Bash nameref feature
# param2: the question to ask
# param3: the default answer to the question 
yes_or_no () {
    local -n ynAnswer=$1
    local question=$2
    local defaultAnswer=$3
    local pattern="^[yn]$"
    local msg="answer must be y or n"
    question="${question} (y/n)?"

    get_answer ynAnswer "$question" "$defaultAnswer" "$pattern" "$msg"
}

# Asks a question with a default answer and will not return the 
# answer until a valid number of characters is entered
# param1: the name of the variable to set using the Bash nameref feature
# param2: the question to ask
# param3: the default answer to the question 
# param4: the minimum valid answer length
# param5: the maximum valid answer length
# param6: optional. if set to "allowWhitespace", it will accept an answer
#         from the user that contains whitespace
length_range () {
    local -n rangeAnswer=$1
    local question=$2
    local defaultAnswer=$3
    local minLength=$4
    local maxLength=$5
    if [[ "$6" == "allowWhitespace" ]];
    then
        local pattern="^.{${minLength},${maxLength}}$"
    else
        local pattern="^[^[:space:]]{${minLength},${maxLength}}$"
    fi
    
    local msg="answer must be at least $minLength character(s) and no more than $maxLength. No whitespaces allowed."
    question="${question}"
    get_answer rangeAnswer "$question" "$defaultAnswer" "$pattern" "$msg"
}

# param1: the region to use to look up the quota.
lookup_quota_details () {
    local regionArg="$1"

    echo ""
    echo "Looking up details on quota $quotaCode for region $regionArg..."

    quotaDetails=$(aws service-quotas get-service-quota \
    --service-code $serviceName \
    --quota-code $quotaCode \
    --region $regionArg)

    echo ""
    echo "$quotaDetails"
    echo ""
}

# param1: the region to update. Won't be used if the quota is global.
request_quota_increase () {
    local regionArg="$1"

    echo ""
    length_range quotaValue "The current value is $oldQuotaValue. What value would you like it to be?" \
    "" "1" "40"

    if [[ "$isGlobal" == "true" ]]; then
        regionQualifier=""
        regionArg=""
    else
        regionQualifier=" in region $regionArg"
        regionArg="--region $regionArg"
    fi

    accountId=$(aws sts get-caller-identity --query Account --output text)
    echo ""
    read -p "You are about to request a \"$quotaCode\" ($quotaDescription) quota value change from $oldQuotaValue to $quotaValue for account $accountId${regionQualifier}. Do you want to proceed (y/n)? [n] " proceed

    if [[ "$proceed" =~ ^([yY])$ ]]; then
        echo ""
        aws service-quotas request-service-quota-increase \
        --service-code $serviceName \
        --quota-code $quotaCode \
        --desired-value $quotaValue \
        $region1Arg

        if [ $? -eq 0 ]; then
            echo ""
            echo "Your request has been received."
            echo ""
        fi

    fi
}

echo ""
echo "Welcome to the service quota wizard!"
echo ""

defaultRegion=$(aws configure get region)

if [[ -z "$defaultRegion" ]]; then
    if [[ -z "$AWS_DEFAULT_REGION" ]]; then
        echo "Please set the region using \"aws configure\" and try again."
        exit 1
    else
        defaultRegion=$AWS_DEFAULT_REGION
    fi
fi

yes_or_no iKnowServiceName "Do you know the exact name of the service that you want to request a quota change for?" "n"

if [[ "$iKnowServiceName" =~ ^([nN])$ ]]; then
    echo ""
    echo "No problem. I can help. I'll show you a list of service names."
    echo ""
    length_range serviceNameLetters "Enter the first letter(s) of the service name (in all lower case) or press RETURN to search for all service names:" \
    "" "0" "30"

    echo ""
    echo "Here is a list of service names for you to choose from..."
    echo ""

    if [[ -z "$serviceNameLetters" ]]; then
        aws service-quotas list-services --query "Services[].ServiceCode" --output text
    else
        aws service-quotas list-services --query "Services[?starts_with(ServiceCode, \`$serviceNameLetters\`) == \`true\`].ServiceCode" --output text
    fi
fi

echo ""
length_range serviceName "Enter the exact service name and I'll show you the service quotas and their current values:" \
    "" "3" "40"
    
echo ""
echo "Great!"
yes_or_no iKnowQuotaCode "Do you know the exact quota code for the $serviceName service?" "n"

if [[ "$iKnowQuotaCode" =~ ^([nN])$ ]]; then
    echo ""
    echo "No problem. I can help. I'll show you a list of $serviceName service quotas..."
    echo ""
    aws service-quotas list-service-quotas --service-code $serviceName \
    --query "Quotas[].{code:QuotaCode,name:QuotaName}"
    # Other properties that could be included: ,value:Value,unit:Unit,adjustable:Adjustable,global:GlobalQuota
fi

echo ""
length_range quotaCode "Enter the quota code that you want to view details for:" \
"" "1" "40"

echo ""
length_range region1 "Which AWS region should be used?" \
"$defaultRegion" "5" "40"

lookup_quota_details "$region1"

yes_or_no iWantIncrease "Would you like to request a $serviceName quota increase?" "n"

if [[ "$iWantIncrease" =~ ^([yY])$ ]]; then
    isAdjustable=$(echo $quotaDetails | jq -r '.Quota.Adjustable | select(type == "boolean")')
    isGlobal=$(echo $quotaDetails | jq -r '.Quota.GlobalQuota | select(type == "boolean")')
    quotaDescription=$(echo $quotaDetails | jq -r '.Quota.QuotaName | select(type == "string")')
    oldQuotaValue=$(echo $quotaDetails | jq -r '.Quota.Value')

    if [[ "$isAdjustable" != "true" ]]; then
        echo ""
        echo "Sorry, but this value is not adjustable."
    else
        request_quota_increase "$region1"
    fi

    if [[ "$isGlobal" != "true" ]]; then

        yes_or_no anotherRegion "Would you like to request that same change to another region?" "n"
        if [[ "$anotherRegion" =~ ^([yY])$ ]]; then
            echo ""
            length_range region2 "What is the name of the AWS region to request an update for?" \
            "us-west-2" "5" "40"

            lookup_quota_details "$region2"
            request_quota_increase "$region2"
        fi

    fi

fi

echo ""
echo "Have a nice day!"



