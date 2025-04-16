#!/usr/bin/env bash

set +u # don't throw an error on referencing unbound variables
scriptDir=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
appRootDir=$scriptDir/..
backstageDir=$appRootDir/backstage
source $scriptDir/helpers.sh

check_harmonix_system_role_login () {

	if [[ -z "$AWS_ACCOUNT_ID" ]]; then
		echo -e "\nERROR: AWS_ACCOUNT_ID is not set. Please set this value in config/.env and try again\n"
		exit 1
	fi

	AWS_ACCOUNT_ID=$(echo "$AWS_ACCOUNT_ID" | tr -d '"') # strip surrounding double quotes if needed

	if [[ -z "$HARMONIX_PROCESS_ROLE_ARN" ]]; then
		HARMONIX_PROCESS_ROLE_ARN=$(aws sts get-caller-identity --output text --query 'Arn') || { echo -e "\nERROR: please log into the AWS CLI before proceeding.\n"; exit 1; }
	fi

	if [[ "$HARMONIX_PROCESS_ROLE_ARN" == *"backstage-master-role"* ]] && [[ "$HARMONIX_PROCESS_ROLE_ARN" == *"$AWS_ACCOUNT_ID"* ]]; then
		echo -e "\nHarmonix system role session confirmed successfully. Proceeding to start Backstage locally.\n"
	else
		confirm_aws_account
		echo -e "\nYou are currently logged in to AWS as ${HARMONIX_PROCESS_ROLE_ARN}"
		echo_warn "\nWARNING: You are not currently logged into the AWS CLI with the Harmonix system role. The Harmonix plugins on the locally-running Backstage may not function properly due to permissions issues."
		sleep 3
	fi
}

start_local () {
	check_harmonix_system_role_login

	echo "Starting a local PostgreSQL container"
	docker compose -p "local-harmonix" -f $appRootDir/config/docker-compose.yml up --build --detach
	echo "Starting the backstage app"
	set -a && source $appRootDir/config/.env && set +a && yarn --cwd $backstageDir start
	# yarn --cwd $backstageDir dev
	echo "Local dev startup completed"
}

start_local_debug () {  ## Start the backstage app for local development with debugging enabled
	check_harmonix_system_role_login

	echo "Starting a local PostgreSQL container"
	docker compose -f $appRootDir/config/docker-compose.yml up --build --detach
	echo "Starting the backstage app with debug"
	set -a && source $appRootDir/config/.env && set +a && yarn --cwd $backstageDir dev-debug
	$backstageDir/node_modules/.bin/concurrently "yarn --cwd $backstageDir start app" "yarn --cwd $backstageDir start backend --inspect"
	echo "Local dev startup completed"
}

stop_local () {  ## Stop all running processes for local development
	echo "Stopping any local PostgreSQL containers"
	docker compose -f $appRootDir/config/docker-compose.yml down
	echo "PostgreSQL container(s) stopped"
	echo "Stopping Backstage"
	kill $(lsof -ti :3000) >/dev/null 2>&1
	kill $(lsof -ti :7007) >/dev/null 2>&1
	echo "Backstage stopped"
}
