#!/usr/bin/env bash

# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

echo -e "\e[0Ksection_start:`date +%s`:install_helm[collapsed=true]\r\e[0KInstalling Helm";
curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3
chmod 700 get_helm.sh
./get_helm.sh -v v3.13.3
rm ./get_helm.sh
echo "helm client version...";
helm version;
echo -e "\e[0Ksection_end:`date +%s`:install_helm\r\e[0K";
