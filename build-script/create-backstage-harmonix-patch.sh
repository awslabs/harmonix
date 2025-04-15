#!/usr/bin/env bash

# Creates a diff/patch between a pure Backstage installation and an installation 
# (of the same Backstage version) that we have customized for Harmonix

scriptDir="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

BACKSTAGE_CREATE_APP_VERSION="0.6.0"
PURE_BACKSTAGE_VERSION="1-37-1"
PURE_BACKSTAGE="backstage-${PURE_BACKSTAGE_VERSION}-pure"
NEW_BACKSTAGE="backstage"

if [[ ! -d "${scriptDir}/../${PURE_BACKSTAGE}" ]]; then
    echo "ERROR: PURE_BACKSTAGE directory \"${PURE_BACKSTAGE}\" does not exist"
    exit 1
fi

if [[ ! -d "${scriptDir}/../${NEW_BACKSTAGE}" ]]; then
    echo "ERROR: NEW_BACKSTAGE directory \"${NEW_BACKSTAGE}\" does not exist"
    exit 1
fi

cd "$scriptDir/.." 1> /dev/null
diff -Naur --exclude=node_modules --exclude=catalog-info.yaml --exclude=*harmonix* --exclude=package.json --exclude=yarn.lock --exclude=app-config.local.yaml --exclude=app-config.aws-production.yaml --exclude=.git --exclude=dist-types --exclude=.env --exclude=*.d.ts --exclude=dist --exclude=.DS_Store --exclude=.yarn ${PURE_BACKSTAGE} ${NEW_BACKSTAGE} > "${scriptDir}/../backstage-mods/backstage_${BACKSTAGE_CREATE_APP_VERSION}.diff.patch"
cd - 1> /dev/null