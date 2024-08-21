#!/usr/bin/env bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
echo -e "\e[0Ksection_start:`date +%s`:install_kubectl[collapsed=true]\r\e[0KInstalling kubectl";
echo "Runtime Architecture: $(uname -m)"
echo "Getting kubectl version v1.29.7 from https://dl.k8s.io/release/v1.29.7/bin/linux/amd64/kubectl"
curl -LO "https://dl.k8s.io/release/v1.29.7/bin/linux/amd64/kubectl"
echo "Got kubectl. Getting kubectl sha hash."
curl -LO "https://dl.k8s.io/release/v1.29.7/bin/linux/amd64/kubectl.sha256"
echo "Got kubectl sha hash. Compairing checksum."
echo "$(cat kubectl.sha256)  kubectl" | sha256sum --check
apt install sudo;
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl;
echo "kubectl client version...";
kubectl version --client;
echo -e "\e[0Ksection_end:`date +%s`:install_kubectl\r\e[0K";