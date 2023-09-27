#!/usr/bin/env bash

scriptDir=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
source $scriptDir/helpers.sh

echo -e "\nInitializing the infrastructure development environment"
cd $backstageIacDir
yarn install
cd -
if [[ -d "$backstageDir" ]]; then
    echo -e "\nInitializing the backstage development environment"
    cd $backstageDir
    yarn install
    yarn tsc
    cd -
    echo -e "\nDevelopment environment initialization finished"
fi
