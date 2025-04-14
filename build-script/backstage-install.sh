#!/usr/bin/env bash

# The Create App version has a direct correlation with the version of Backstage
# that is installed. 
# 0.6.0 will install Backstage 1.37.1
# See https://backstage.github.io/upgrade-helper/?yarnPlugin=0 the mapping between create app version and Backstage version
BACKSTAGE_CREATE_APP_VERSION="0.6.0"

# The Harmonix Backstage plugins can be installed in 1 of 2 ways. Firstly, the latest
# published NPM packages can be used. Alternatively, the plugins can be installed
# based upon the source code provided in the 'backstage-plugins' directory.
# If you want to modify the plugin source code or use plugin code that
# has not been published to NPM yet, you'll need to install the Harmonix plugins
# from the 'backstage-plugins' source code.
# 
# Set installMode to "from-source" to build/install Harmonix plugins from source
# or set installMode to "npm" to install the latest published Harmonix NPM packages.
installMode="from-source"
NC='\033[0m' # No Color
RED='\033[1;31m'

biScriptDir=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
harmonixHomeDir=$biScriptDir/..
cd $harmonixHomeDir
harmonixHomeDir=$(pwd)
backstageDir=$harmonixHomeDir/backstage

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
echo "Copying Harmonix plugins"
echo "" #intentional blank line
echo "installMode is \"$installMode\""
if [[ "$installMode" == "from-source" ]]; then
    cp -R $harmonixHomeDir/backstage-plugins/plugins/catalog-backend-module-harmonix $backstageDir/plugins/
    cp -R $harmonixHomeDir/backstage-plugins/plugins/harmonix-frontend $backstageDir/plugins/
    cp -R $harmonixHomeDir/backstage-plugins/plugins/harmonix-backend $backstageDir/plugins/
    cp -R $harmonixHomeDir/backstage-plugins/plugins/harmonix-common $backstageDir/plugins/
    cp -R $harmonixHomeDir/backstage-plugins/plugins/scaffolder-backend-module-harmonix $backstageDir/plugins/
    cp $harmonixHomeDir/backstage-plugins/plugins/package.json $backstageDir/plugins/

    # It is expected that the version identifier in each plugin's package.json will be
    # a larger semver identifier than any version that is officially published to npm registry.
    AWS_APPS_VERSION=$(cat $backstageDir/plugins/harmonix-frontend/package.json | jq -r '.version')
    AWS_APPS_BACKEND_VERSION=$(cat $backstageDir/plugins/harmonix-backend/package.json | jq -r '.version')
    AWS_APPS_SCAFFOLDER_VERSION=$(cat $backstageDir/plugins/scaffolder-backend-module-harmonix/package.json | jq -r '.version')
    AWS_APPS_CATALOG_PROCESS_VERSION=$(cat $backstageDir/plugins/catalog-backend-module-harmonix/package.json | jq -r '.version')
else
    AWS_APPS_VERSION=^$(cat $harmonixHomeDir/backstage-plugins/plugins/harmonix-frontend/package.json | jq -r '.version')
    AWS_APPS_BACKEND_VERSION=^$(cat $harmonixHomeDir/backstage-plugins/plugins/harmonix-backend/package.json | jq -r '.version')

    AWS_APPS_SCAFFOLDER_VERSION=^$(cat $harmonixHomeDir/backstage-plugins/plugins/scaffolder-backend-module-harmonix/package.json | jq -r '.version')
    AWS_APPS_CATALOG_PROCESS_VERSION=$(cat $harmonixHomeDir/backstage-plugins/plugins/catalog-backend-module-harmonix/package.json | jq -r '.version')
fi

# AWS_APPS_DEMO_VERSION=$(cat $backstageDir/plugins/aws-apps-demo/package.json | jq -r '.version')
    # AWS_APPS_DEMO_VERSION=^$(cat $harmonixHomeDir/backstage-plugins/plugins/aws-apps-demo/package.json | jq -r '.version')
cd $backstageDir

echo "" #intentional blank line
echo "Copying the AWS production configuration to backstage"
cp $harmonixHomeDir/config/app-config.aws-production.yaml $backstageDir

# # Install backend dependencies
echo "" #intentional blank line
echo "Installing backend dependencies"
yarn --cwd packages/backend add \
    "@backstage/plugin-catalog-backend-module-github@^0.7.11" \
    "@backstage/plugin-catalog-backend-module-gitlab@^0.6.4" \
    "@backstage/plugin-permission-backend@^0.5.55" \
    "@roadiehq/catalog-backend-module-okta@^1.1.2" \
    "@immobiliarelabs/backstage-plugin-gitlab-backend@^6.11.0" \
    "@aws/plugin-aws-apps-backend-for-backstage@${AWS_APPS_BACKEND_VERSION}" \
    "@aws/plugin-scaffolder-backend-aws-apps-for-backstage@${AWS_APPS_SCAFFOLDER_VERSION}" \
    "@aws/backstage-plugin-catalog-backend-module-aws-apps-entities-processor@${AWS_APPS_CATALOG_PROCESS_VERSION}"

# # Install frontend dependencies
echo "" #intentional blank line
echo "Installing frontend dependencies"
yarn --cwd packages/app add \
    "@immobiliarelabs/backstage-plugin-gitlab@^6.11.0" \
    "@backstage-community/plugin-github-actions@^0.9.0" \
    "@aws/plugin-aws-apps-for-backstage@${AWS_APPS_VERSION}" \
    "@backstage/plugin-home" 
    
    # \
    # "@aws/plugin-aws-apps-demo-for-backstage@${AWS_APPS_DEMO_VERSION}"

cd -
# Copy/overwrite modified backstage files.
# Note that these modifications were based on modifying Backstage 1.17 files.  
# Later versions of Backstage may modify the base versions of these files and the overwrite action may wipe out intended Backstage changes.
# A preferred approach is to be intentional in the customization of Backstage and follow the instructions in the 
# plugins' README files to manually modify the Backstage source files
# patch -d$(basename ${backstageDir}) -p1 < $harmonixHomeDir/backstage-mods/backstage_${BACKSTAGE_CREATE_APP_VERSION}.diff.patch
git apply --directory=$(basename $backstageDir) --verbose --whitespace=nowarn $harmonixHomeDir/backstage-mods/backstage_${BACKSTAGE_CREATE_APP_VERSION}.diff.patch || \
    (echo "${RED}Error applying Harmonix diff patch to Backstage. This error can be ignored if the patch was already successfully applied previously. If not, the patch will need to be applied manually before proceeding.${NC}")
