#!/usr/bin/env bash

echo "Checking for IMDSv2 for Gitlab EC2 instances"
scriptDir=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

EC2_INSTANCES=( $(aws ec2 describe-instances --filters "Name=metadata-options.http-tokens,Values=optional" "Name=instance-state-code,Values=16" "Name=tag:Name,Values=opa-GitlabHost" --query "Reservations[*].Instances[*].[InstanceId]" --output text) )
# EC2_INSTANCES=$(aws ec2 describe-instances --filters "Name=metadata-options.http-tokens,Values=optional" "Name=tag:Name,Values=opa-GitlabHost" --query "Reservations[*].Instances[*].[InstanceId]" --output text)

if (( ${#EC2_INSTANCES[@]} > 0 )); then
  echo "Found ${#EC2_INSTANCES[@]} Gitlab host instances where IMDSv2 is not enforced"
  for i in "${EC2_INSTANCES[@]}"
  do
    echo "Enforcing IMDSv2 for instance: ${i}"
    aws ec2 modify-instance-metadata-options \
      --instance-id ${i} \
      --http-tokens required \
      --http-endpoint enabled
  done
fi
