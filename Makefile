# // Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# // SPDX-License-Identifier: Apache-2.0

REGION						= us-east-1
export CDK_DEFAULT_REGION=$(REGION)
SHELL := /bin/bash

.DEFAULT_GOAL := help

# ***** LOCAL TASKS *****

clean:  ## deletes generated files and dependency modules
	./scripts/clean.sh

clean-dist:
	@echo "cleaning build artifacts"
	(rm -rf dist/)

build-dist: clean-dist
	@echo "building archive for deliverable artifacts"
	(mkdir dist)
	./scripts/build-dist.sh

npm-install:  ## Initialize your local development environment
	./scripts/npm-install.sh

build-backstage:  ## Builds the backstage frontend and backend app
	./scripts/build-backstage.sh

deploy-backstage:
	./scripts/deploy-backstage.sh

set-backstage-env:
	./scripts/set-backstage-env.sh

build: ## Init entire project 
	$(MAKE) npm-install
	$(MAKE) build-backstage
	$(MAKE) set-backstage-env

backstage-install: ## install base backstage app and dependency modules
	. ./scripts/backstage-install.sh

# Local Debugging
start-local:  ## Start the backstage app for local development
	. ./scripts/local-runners.sh; start_local

start-local-debug:  ## Start the backstage app for local development with debugging enabled
	. ./scripts/local-runners.sh; start_local_debug

stop-local:  ## Stop all running processes for local development
	. ./scripts/local-runners.sh; stop_local

push-backstage-reference-repo:
	. ./scripts/gitlab-tools.sh

# ***** CDK TASKS *****
bootstrap:  ## Bootstrap the CDK in an AWS account
	@echo "Bootstrap CDK account for backstage.IO"
	cd infrastructure; \
	node_modules/aws-cdk/bin/cdk bootstrap -c region=$(REGION); \
	cd -
	@echo "Bootstrap Finished."

deploy: ## Generic deploy method
	@echo "Deploy BAWS Solution Stack $(ENV_NAME)"
	@cd infrastructure; \
	node_modules/aws-cdk/bin/cdk deploy --context region=$(REGION) --context env_name=$(ENV_NAME) $(stack_names) --require-approval never; \
	cd -
	@echo "Deploy Finished."

build-and-deploy-backstage-image: build-backstage deploy-backstage

deploy-prereq:
	$(MAKE) deploy stack_names="BAWSPrereqStack"

deploy-solution:  ## Deploy infrastructure to the AWS account/region
	$(MAKE) deploy stack_names="BAWSStack BAWSWaf"

deploy-gitlab-runner:
	$(MAKE) deploy stack_names="BAWSGitLabRunnerStack"	

destroy-solution:  ## teardown the CDK infrastructure
	@echo "Destroy BAWS account for backstage.IO"
	cd infrastructure; \
	node_modules/aws-cdk/bin/cdk destroy -c region=$(REGION) BAWSStack BAWSWaf --require-approval never; \
	cd -
	@echo "Destroy Finished."

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
	