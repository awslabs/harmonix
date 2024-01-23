#!/usr/bin/env bash

# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

export FUNCTION_NAME=${TARGET_KUBECTL_LAMBDA_ARN##*:}

export LAMBDA_PAYLOAD=$(
  jq --null-input \
    --arg clusterName "${clusterName}" \
    --arg manifest "${MANIFEST_JSON}" \
    --arg roleArn "${TARGET_KUBECTL_LAMBDA_ROLE_ARN}" \
    '{RequestType: "Update", ResourceType: "Custom::AWSCDK-EKS-KubernetesResource", ResourceProperties: {ClusterName: $clusterName, Manifest: $manifest, RoleArn: $roleArn}}')

echo "lambda payload:"
echo $LAMBDA_PAYLOAD

# aws cli v1
# lambdaResult="$(aws lambda invoke --function-name $FUNCTION_NAME --region $REGION \
#   --log-type Tail --output json \
#   --payload "$LAMBDA_PAYLOAD" lambda_response.json)"

# aws cli v2
lambdaResult="$(aws lambda invoke \
  --function-name $FUNCTION_NAME \
  --cli-binary-format raw-in-base64-out \
  --log-type Tail \
  --region $REGION \
  --payload "$LAMBDA_PAYLOAD" lambda_response.json)"

if [ $? -ne 0 ]; then
  exit 1;
fi

cat lambda_response.json
rm lambda_response.json

echo "$lambdaResult" | jq -r .LogResult | base64 -d
isLambdaError=$(echo $lambdaResult | jq 'has("FunctionError")')

if [[ "true" == "$isLambdaError" ]]; then
  echo "Lambda returned with an error"
  exit 1
fi
