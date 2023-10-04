#!/usr/bin/env bash

# The Create App version has a direct correlation with the version of Backstage
# that is installed. 
# 0.5.4 will install Backstage 0.17.5
BACKSTAGE_CREATE_APP_VERSION="0.5.4"

# The OPA Backstage plugins can be installed in 1 of 2 ways. Firstly, the latest
# published NPM packages can be used. Alternatively, the plugins can be installed
# based upon the source code provided in the 'backstage-plugins' directory.
# If you want to modify the plugin source code or use plugin code that
# has not been published to NPM yet, you'll need to install the OPA plugins
# from the 'backstage-plugins' source code.
# 
# Set installMode to "from-source" to build/install OPA plugins from source
# or set installMode to "npm" to install the latest published OPA NPM packages.
installMode="npm"
NC='\033[0m' # No Color
RED='\033[1;31m'

biScriptDir=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
opaHomeDir=$biScriptDir/..
cd $opaHomeDir
opaHomeDir=$(pwd)
backstageDir=$opaHomeDir/backstage

echo "" #intentional blank line

# install base backstage app
if [ ! -d "$backstageDir" ]; then
    echo "Installing the latest Backstage app using Create App version $BACKSTAGE_CREATE_APP_VERSION"
    BACKSTAGE_APP_NAME=backstage npx -y -q @backstage/create-app@$BACKSTAGE_CREATE_APP_VERSION --path $backstageDir
else
    echo "Backstage app directory already exists. Continuing..."
fi

# Copy the backstage-plugins into the backstage/plugins directory
echo "" #intentional blank line
echo "Copying AWS Apps plugins"
echo "" #intentional blank line
echo "installMode is \"$installMode\""
if [[ "$installMode" == "from-source" ]]; then
    cp -R $opaHomeDir/backstage-plugins/ $backstageDir

    # It is expected that the version identifier in each plugin's package.json will be
    # a larger semver identifier than any version that is officially published to npm registry.
    AWS_APPS_VERSION=$(cat $backstageDir/plugins/aws-apps/package.json | jq -r '.version')
    AWS_APPS_BACKEND_VERSION=$(cat $backstageDir/plugins/aws-apps-backend/package.json | jq -r '.version')
    AWS_APPS_DEMO_VERSION=$(cat $backstageDir/plugins/aws-apps-demo/package.json | jq -r '.version')
    AWS_APPS_SCAFFOLDER_VERSION=$(cat $backstageDir/plugins/scaffolder-backend-module-aws-apps/package.json | jq -r '.version')
else
    AWS_APPS_VERSION=^$(cat $opaHomeDir/backstage-plugins/plugins/aws-apps/package.json | jq -r '.version')
    AWS_APPS_BACKEND_VERSION=^$(cat $opaHomeDir/backstage-plugins/plugins/aws-apps-backend/package.json | jq -r '.version')
    AWS_APPS_DEMO_VERSION=^$(cat $opaHomeDir/backstage-plugins/plugins/aws-apps-demo/package.json | jq -r '.version')
    AWS_APPS_SCAFFOLDER_VERSION=^$(cat $opaHomeDir/backstage-plugins/plugins/scaffolder-backend-module-aws-apps/package.json | jq -r '.version')
fi

cd $backstageDir

echo "" #intentional blank line
echo "Copying the AWS production configuration to backstage"
cp $opaHomeDir/config/app-config.aws-production.yaml $backstageDir

# Install backend dependencies
echo "" #intentional blank line
echo "Installing backend dependencies"
yarn --cwd packages/backend add \
    "@backstage/plugin-catalog-backend-module-gitlab@^0.2.6" \
    "@backstage/plugin-permission-backend@^0.5.25" \
    "@roadiehq/catalog-backend-module-okta@^0.8.5" \
    "@roadiehq/scaffolder-backend-module-utils@^1.10.1" \
    "@immobiliarelabs/backstage-plugin-gitlab-backend@^6.0.0" \
    "@aws/plugin-aws-apps-backend-for-backstage@${AWS_APPS_BACKEND_VERSION}" \
    "@aws/plugin-scaffolder-backend-aws-apps-for-backstage@${AWS_APPS_SCAFFOLDER_VERSION}"

# Install frontend dependencies
echo "" #intentional blank line
echo "Installing frontend dependencies"
yarn --cwd packages/app add \
    "@immobiliarelabs/backstage-plugin-gitlab@^6.0.0" \
    "@aws/plugin-aws-apps-for-backstage@${AWS_APPS_VERSION}" \
    "@backstage/plugin-home" \
    "@aws/plugin-aws-apps-demo-for-backstage@${AWS_APPS_DEMO_VERSION}"

cd -
# Copy/overwrite modified backstage files.
# Note that these modifications were based on modifying Backstage 1.17 files.  
# Later versions of Backstage may modify the base versions of these files and the overwrite action may wipe out intended Backstage changes.
# A preferred approach is to be intentional in the customization of Backstage and follow the instructions in the 
# plugins' README files to manually modify the Backstage source files
# patch -d$(basename ${backstageDir}) -p1 < $opaHomeDir/backstage-mods/backstage_${BACKSTAGE_CREATE_APP_VERSION}.diff.patch
git apply --directory=$(basename $backstageDir) --verbose --whitespace=nowarn $opaHomeDir/backstage-mods/backstage_${BACKSTAGE_CREATE_APP_VERSION}.diff.patch || \
    (echo "${RED}Error applying OPA diff patch to Backstage. This error can be ignored if the patch was already successfully applied previously. If not, the patch will need to be applied manually before proceeding.${NC}")
