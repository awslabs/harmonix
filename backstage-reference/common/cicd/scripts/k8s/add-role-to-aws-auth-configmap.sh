#!/usr/bin/env bash

# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

# Adds an IAM role to the aws-auth configmap in the kube-system namespace

if [[ -z "$AppAdminRoleArn" ]]; then
    echo "AppAdminRoleArn not set. Skipping updating aws-auth ConfigMap."
    return 0;
fi

echo "AppAdminRoleArn detected. Updating aws-auth ConfigMap."

FUNCTION_NAME=${TARGET_KUBECTL_LAMBDA_ARN##*:}

GET_AWS_AUTH_LAMBDA_PAYLOAD=$(
  jq --null-input \
    --arg clusterName "${clusterName}" \
    --arg manifest "${MANIFEST_JSON}" \
    --arg roleArn "${TARGET_KUBECTL_LAMBDA_ROLE_ARN}" \
    '{RequestType: "Create", ResourceType: "Custom::AWSCDK-EKS-KubernetesObjectValue", ResourceProperties: {TimeoutSeconds: "10", ClusterName: $clusterName, RoleArn: $roleArn, ObjectNamespace: "kube-system", ObjectType: "configmap", ObjectName: "aws-auth", JsonPath: "@"}}')

echo -e "\nlambda payload to retrieve aws-auth configmap:"
echo $GET_AWS_AUTH_LAMBDA_PAYLOAD

# aws cli v1
# getCMLambdaResult="$(aws lambda invoke --function-name $FUNCTION_NAME --region $REGION \
#   --log-type Tail --output json \
#   --payload "$GET_AWS_AUTH_LAMBDA_PAYLOAD" aws-auth-lambda_response.json)"

# aws cli v2
getCMLambdaResult="$(aws lambda invoke \
  --function-name $FUNCTION_NAME \
  --cli-binary-format raw-in-base64-out \
  --log-type Tail \
  --region $REGION \
  --payload "$GET_AWS_AUTH_LAMBDA_PAYLOAD" aws-auth-lambda_response.json)"

if [ $? -ne 0 ]; then
  exit 1;
fi

echo "$getCMLambdaResult" | jq -r .LogResult | base64 -d
isLambdaError=$(echo $getCMLambdaResult | jq 'has("FunctionError")')

if [[ "true" == "$isLambdaError" ]]; then
  echo "Lambda returned with an error"
  exit 1
fi

currentConfigMapJson="$(jq -r '.Data.Value' aws-auth-lambda_response.json)"
echo -e "\ncurrentConfigMapJson:"
echo "$currentConfigMapJson"

rm aws-auth-lambda_response.json

currentRolesArray="$(echo "$currentConfigMapJson" | jq -r '.data.mapRoles')"
firstChar=${currentRolesArray:0:1}

# Check to see if response is in YAML instead of JSON
if [[ "$firstChar" != "[" || "$firstChar" != "{" ]]; then
  echo "Converting YAML ConfigMap lookup response to JSON"
  currentRolesArray="$(echo -e "$currentRolesArray" | yq .)"
fi

# Remove linebreaks from JSON
currentRolesArray="$(echo $currentRolesArray)"

echo -e "\ncurrentRolesArray:"
echo "$currentRolesArray"

if [[ "$currentRolesArray" == *"$AppAdminRoleArn"* ]]; then
    echo "Skipping updating aws-auth ConfigMap since it already contains $AppAdminRoleArn."
    exit 0
else
    echo "ConfigMap does not already contain $AppAdminRoleArn. Proceeding to add it."
fi

# remove "]" from the end of the array string
newRolesArray="${currentRolesArray::${#currentRolesArray}-1}"

# Add App Admin role object to the array
newRolesArray="${newRolesArray}, {\"rolearn\":\"$AppAdminRoleArn\",\"username\":\"$AppAdminRoleArn\",\"groups\":[]}]"

echo "newRolesArray:"
echo "$newRolesArray"

# We now need to escape quotes
currentRolesArray="${currentRolesArray//\"/\\\"}"
newRolesArray="${newRolesArray//\"/\\\"}"

echo "escaped currentRolesArray:"
echo "$currentRolesArray"

echo "escaped newRolesArray:"
echo "$newRolesArray"

applyPatchJson="{\"data\": {\"mapRoles\": \"$newRolesArray\"}}"
restorePatchJson="{\"data\": {\"mapRoles\": \"$currentRolesArray\"}}"

# Add the new app admin role to the aws-auth ConfigMap by way of a patch

PATCH_AWS_AUTH_LAMBDA_PAYLOAD=$(
  jq --null-input \
    --arg clusterName "${clusterName}" \
    --arg roleArn "${TARGET_KUBECTL_LAMBDA_ROLE_ARN}" \
    --arg applyPatchJson "$applyPatchJson" \
    --arg restorePatchJson "$restorePatchJson" \
    '{RequestType: "Create", ResourceType: "Custom::AWSCDK-EKS-KubernetesPatch", ResourceProperties: {ClusterName: $clusterName, RoleArn: $roleArn, ResourceNamespace: "kube-system", ApplyPatchJson: $applyPatchJson, RestorePatchJson: $restorePatchJson, ResourceName: "configmap/aws-auth", PatchType: "strategic"}}')

echo -e "\nlambda payload to patch aws-auth configmap:"
echo $PATCH_AWS_AUTH_LAMBDA_PAYLOAD

# aws cli v1
# patchCMLambdaResult="$(aws lambda invoke --function-name $FUNCTION_NAME --region $REGION \
#   --log-type Tail --output json \
#   --payload "$PATCH_AWS_AUTH_LAMBDA_PAYLOAD" patch-aws-auth-lambda_response.json)"

# aws cli v2
patchCMLambdaResult="$(aws lambda invoke \
  --function-name $FUNCTION_NAME \
  --cli-binary-format raw-in-base64-out \
  --log-type Tail \
  --region $REGION \
  --payload "$PATCH_AWS_AUTH_LAMBDA_PAYLOAD" patch-aws-auth-lambda_response.json)"

if [ $? -ne 0 ]; then
  exit 1;
fi

echo $patchCMLambdaResult | jq -r .LogResult | base64 -d
isLambdaError=$(echo $patchCMLambdaResult | jq 'has("FunctionError")')

if [[ "true" == "$isLambdaError" ]]; then
  echo "Lambda returned with an error"
  exit 1
fi

rm patch-aws-auth-lambda_response.json

echo "Successfully updated aws-auth ConfigMap with IAM role: $AppAdminRoleArn"


