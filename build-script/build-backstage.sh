#!/usr/bin/env bash

echo "Building the backstage app..."
scriptDir=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
backstageDir=${scriptDir}/../backstage
configDir=${scriptDir}/../config

source ${configDir}/.env

yarn --cwd  $backstageDir tsc
yarn --cwd  $backstageDir build:all
# yarn build-image
export DOCKER_BUILDKIT=1
docker build . -f ${configDir}/aws-production.Dockerfile --tag opa-backstage
echo "Backstage app build finished"