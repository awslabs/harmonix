#!/usr/bin/env bash

# Creates a diff/patch between a pure Backstage installation and an installation 
# (of the same Backstage version) that we have customized for Harmonix.

scriptDir="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
appDir="$(dirname "$scriptDir")"

# Set BACKSTAGE_CREATE_APP_VERSION variable
source $scriptDir/helpers.sh

PURE_BACKSTAGE="backstage-pure"
HARMONIX_BACKSTAGE="backstage"
PATCH_FILE="${appDir}/backstage-mods/backstage_${BACKSTAGE_CREATE_APP_VERSION}.diff.patch"

if [[ ! -d "${appDir}/${PURE_BACKSTAGE}" ]]; then
    echo -e "${RED}ERROR: \"${PURE_BACKSTAGE}\" directory does not exist."
    echo -e "You can create it by running this command:${NC}\n"
    echo -e "${CYAN}BACKSTAGE_APP_NAME=${PURE_BACKSTAGE} npx -y -q @backstage/create-app@${BACKSTAGE_CREATE_APP_VERSION} --path \"${appDir}/${PURE_BACKSTAGE}\"\n${NC}"
    exit 1
fi

if [[ ! -d "${appDir}/${HARMONIX_BACKSTAGE}" ]]; then
    echo -e "${RED}ERROR: \"${HARMONIX_BACKSTAGE}\" directory does not exist"
    echo -e "You can create it by running 'make backstage-install'${NC}"
    exit 1
fi

echo -e "\nCreating patch file..."

cd "$appDir" 1> /dev/null
diff -Naur --exclude=node_modules --exclude=catalog-info.yaml --exclude=*harmonix* --exclude=package.json --exclude=yarn.lock --exclude=app-config.local.yaml --exclude=app-config.aws-production.yaml --exclude=.git --exclude=dist-types --exclude=.env --exclude=*.d.ts --exclude=dist --exclude=.DS_Store --exclude=.yarn --exclude=tsconfig.json "${PURE_BACKSTAGE}" "${HARMONIX_BACKSTAGE}" > "${PATCH_FILE}"

echo_ok "\nSuccessfully created patch file at ${PATCH_FILE}\n"

echo -e "It's a good idea to delete the ${PURE_BACKSTAGE} directory now. You can always download it again later.\n"

cd - 1> /dev/null