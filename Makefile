# // Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# // SPDX-License-Identifier: Apache-2.0

-include ./config/.env
export
SHELL := /usr/bin/env bash -euo pipefail -c
LOGFILE := $(shell date +'install_%Y%m%d-%H%M.log')

.PHONY: clean backstage-install

##@ Local Tasks

install: verify-env
	@echo -e "\nStarting with 'clean' to remove any previously installed local dependencies\n====================" 2>&1 | tee -a $(LOGFILE)
	@$(MAKE) clean 2>&1 | tee -a $(LOGFILE)
	@echo -e "\nStarting the Backstage installation\n====================" 2>&1 | tee -a $(LOGFILE)
	@$(MAKE) backstage-install 2>&1 | tee -a $(LOGFILE)
	@echo -e "\nBootstrapping CDK\n====================" 2>&1 | tee -a $(LOGFILE)
	@$(MAKE) cdk-bootstrap 2>&1 | tee -a $(LOGFILE)
	@echo -e "\nSetting Secrets\n====================" 2>&1 | tee -a $(LOGFILE)
	@$(MAKE) set-secrets 2>&1 | tee -a $(LOGFILE)
	@echo -e "\nDeploying the OPA platform\n====================" 2>&1 | tee -a $(LOGFILE)
	@$(MAKE) deploy-platform 2>&1 | tee -a $(LOGFILE)
	@echo -e "\nUpdating configuration with platform values\n====================" 2>&1 | tee -a $(LOGFILE)
	@$(MAKE) set-gitlab-token-env-var 2>&1 | tee -a $(LOGFILE)
	@echo -e "\nPushing the backstage reference repository\n====================" 2>&1 | tee -a $(LOGFILE)
	@$(MAKE) push-backstage-reference-repo 2>&1 | tee -a $(LOGFILE)
	@echo -e "\nBuilding the backstage image\n====================" 2>&1 | tee -a $(LOGFILE)
	@$(MAKE) build-backstage 2>&1 | tee -a $(LOGFILE)
	@echo -e "\nDeploying the backstage image\n====================" 2>&1 | tee -a $(LOGFILE)
	@$(MAKE) deploy-backstage 2>&1 | tee -a $(LOGFILE)
	@echo -e "\n\n" 2>&1 | tee -a $(LOGFILE)
	@echo -e "Installation complete and the application is starting!" 2>&1 | tee -a $(LOGFILE)
	@echo -e "Visit the application at https://${R53_HOSTED_ZONE_NAME}" 2>&1 | tee -a $(LOGFILE)

verify-env:
ifeq (,$(wildcard ./config/.env))
    $(error The configuration file at ./config/.env is missing.  Please configure the .env file first.)
endif
	@echo "Found a ./config/.env file.  Proceeding..."
ifndef AWS_ACCOUNT_ID
	$(error AWS_ACCOUNT_ID is undefined.  Please ensure this is set in the config/.env file)
endif
ifndef AWS_DEFAULT_REGION
	$(error AWS_DEFAULT_REGION is undefined.  Please ensure this is set in the config/.env file)
endif

set-secrets:
	./build-script/secure-secrets-creation.sh

delete-secrets:
	./build-script/secure-secrets-creation.sh "delete"
	
set-gitlab-token-env-var:
	./build-script/set-gitlab-token.sh

clean:  ## deletes generated files and dependency modules
	./build-script/clean.sh

clean-dist:
	@echo "cleaning build artifacts"
	(rm -rf dist/)

build-dist: clean-dist
	@echo "building archive for deliverable artifacts"
	(mkdir dist)
	./build-script/build-dist.sh

yarn-install:  ## Initialize your local development environment
	./build-script/yarn-install.sh

build-backstage:  ## Builds the backstage frontend and backend app
	./build-script/build-backstage.sh

deploy-backstage:
	./build-script/deploy-backstage.sh

build: ## Init entire project 
	$(MAKE) yarn-install
	$(MAKE) build-backstage

backstage-install: ## install base backstage app and dependency modules
	$(MAKE) yarn-install
	. ./build-script/backstage-install.sh
	$(MAKE) yarn-install

##@ Local Debugging

start-local-with-role:  ## Assume the Harmonix system role and start the Backstage app for local development
	. ./build-script/local-backstage-role-assumption.sh

start-local-debug-with-role:  ## Assume the Harmonix system role and start the Backstage app in debug mode for local development
	. ./build-script/local-backstage-role-assumption.sh "debug"

start-local:  ## Start the backstage app for local development
	. ./build-script/local-runners.sh; start_local

start-local-debug:  ## Start the backstage app for local development with debugging enabled
	. ./build-script/local-runners.sh; start_local_debug

stop-local:  ## Stop all running processes for local development
	. ./build-script/local-runners.sh; stop_local

push-backstage-reference-repo:
	. ./build-script/gitlab-tools.sh

build-and-deploy-backstage-image: build-backstage deploy-backstage

##@ CDK Tasks
cdk-bootstrap:  ## Bootstrap the CDK in an AWS account
	@echo "Bootstrapping the account for AWS CDK"
	@. ./build-script/deploy-cdk-bootstrap.sh
	@echo "Bootstrap Finished."

##@ Harmonix Infrastructure Tasks

# Resolves all environment variables in template files, executes "cdk deploy" 
# for the OPAStack, then restores template files to their original content
deploy-platform: ## Deploys the platform CDK stack
	. ./build-script/deploy-platform.sh

# Resolves all environment variables in template files, executes "cdk destroy"
# for the OPAStack stack, then restores template files to their original content
destroy-platform:  ## Destroys the platform CDK stack	
	. ./build-script/destroy-platform.sh

# Compiles and builds Harmonix Backstage plugins
plugins-build:
	cd ./backstage-plugins/plugins && \
	set -e && \
	yarn install && \
	yarn run tsc && \
	yarn run build

# Run unit tests on Harmonix Backstage plugins
plugins-test: plugins-build
	cd ./backstage-plugins/plugins && \
	set -e && \
	yarn run test

# Clean uncommitted files that are generated during compilation/testing and are not 
# used by Backstage or committed to version control
plugins-clean:
	cd ./backstage-plugins/plugins && \
	set -e && \
	find . -name dist -type d -prune -exec rm -rf '{}' + && \
	find . -name dist-types -type d -prune -exec rm -rf '{}' + && \
	find . -name node_modules -type d -prune -exec rm -rf '{}' +

##@ General
help:  ## Show help message
	@awk 'BEGIN {FS = ": .*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[$$()% 0-9a-zA-Z_-]+(\\:[$$()% 0-9a-zA-Z_-]+)*:.*?##/ { gsub(/\\:/,":", $$1); printf "  \033[36m%-30s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)
