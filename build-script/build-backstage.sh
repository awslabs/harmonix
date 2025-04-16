#!/usr/bin/env bash

echo "Building the backstage app..."
scriptDir=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
backstageDir=${scriptDir}/../backstage
configDir=${scriptDir}/../config

source ${configDir}/.env

cd "$backstageDir"

yarn install --immutable

# tsc outputs type definitions to dist-types/ in the repo root, which are then consumed by the build
yarn tsc

# Build the backend, which bundles it all up into the packages/backend/dist folder.
yarn build:backend

export DOCKER_BUILDKIT=1
docker build --platform linux/amd64 . -f ${configDir}/aws-production.Dockerfile --tag opa-backstage
echo "Backstage app build finished"

cd -
