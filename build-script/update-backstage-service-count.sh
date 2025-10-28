#!/usr/bin/env bash

set -o pipefail # FAIL FAST
scriptDir=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
source $scriptDir/helpers.sh
shopt -s expand_aliases

# Set the desired count of the service to the first argument; otherwisee, the service will be scaled to 2
DESIRED_COUNT=${1:-2}

echo "Updating the desired count of the backstage service to $DESIRED_COUNT"
ECS_CLUSTER_ARN=$(aws ecs list-clusters --query "clusterArns[?contains(@,'${APP_NAME}-platform')] | [0]" --output text)

if [[ ! -z "$ECS_CLUSTER_ARN" ]] && [[ "$ECS_CLUSTER_ARN" != "None" ]]; then
    BACKSTAGE_SERVICE_ARN=$(aws ecs list-services --cluster "$ECS_CLUSTER_ARN" --query "serviceArns[?contains(@, '${APP_NAME}-platform')] | [0]" --output text)
    
    if [[ ! -z "$BACKSTAGE_SERVICE_ARN" ]] && [[ "$BACKSTAGE_SERVICE_ARN" != "None" ]]; then
        echo "Attempting to set backstage service desired count to $DESIRED_COUNT..."
        aws ecs update-service --cluster "$ECS_CLUSTER_ARN" --service "$BACKSTAGE_SERVICE_ARN" --force-new-deployment --desired-count $DESIRED_COUNT 2>&1 > /dev/null
        if [[ $? -eq 0 ]]; then
            echo "Update Succeeded"
        else
            echo "Update Failed"
        fi
    else
        echo "No Backstage service currently exists in the ECS cluster - $ECS_CLUSTER_ARN"
    fi
    
else
    echo "No ${APP_NAME}-platform ECS cluster currently exists in the account."
fi
