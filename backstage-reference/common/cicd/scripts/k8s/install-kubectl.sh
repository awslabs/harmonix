#!/usr/bin/env bash

# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

echo -e "\e[0Ksection_start:`date +%s`:install_kubectl[collapsed=true]\r\e[0KInstalling kubectl";
curl -LO https://dl.k8s.io/release/v1.28.4/bin/linux/amd64/kubectl;
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl.sha256";
echo "$(cat kubectl.sha256)  kubectl" | sha256sum --check;
apt install sudo;
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl;
echo "kubectl client version...";
kubectl version --client;
echo -e "\e[0Ksection_end:`date +%s`:install_kubectl\r\e[0K";
