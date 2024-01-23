#!/usr/bin/env bash

# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

# Search for DNS name of a load balancer that is created by a k8s Ingress.
# We will look for the load balancer based on a tag.

tagKey="$1"
echo "Searching for load balancer tagged with key \"$tagKey\""

# loop 50 times, increment i by 1
for i in {1..51..1}
do
    for i in $(aws elbv2 describe-load-balancers --region $REGION | jq -r '.LoadBalancers[].LoadBalancerArn'); do aws elbv2 describe-tags --region $REGION --resource-arns "$i" | jq -ce --arg tagKey "$tagKey" ".TagDescriptions[].Tags[] | select( .Key == \"$tagKey\")" && INGRESS_ALB_ARN="$i";done

    if [[ -z "$INGRESS_ALB_ARN" ]]; then
        echo "Ingress load balancer was not yet created."
        echo "Sleeping for 5 seconds"
        sleep 5
    else

        INGRESS_DNS=$(aws elbv2 describe-load-balancers --region $REGION --load-balancer-arns $INGRESS_ALB_ARN | jq -r -ce ".LoadBalancers[].DNSName")
        echo "INGRESS_DNS is $INGRESS_DNS"
        # Make ingress value available to CICD
        echo "$INGRESS_DNS" > $CI_PROJECT_DIR/ingressDNS.txt

        # Stop the for loop
        break
    fi

done

if [[ -z "$INGRESS_DNS" ]]; then
    echo "WARN: Ingress DNS could not be detected. Make sure your Ingress has the \"alb.ingress.kubernetes.io/tags\" annotation with a value of \"$tagKey\""
fi
