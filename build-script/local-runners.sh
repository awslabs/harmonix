#!/usr/bin/env bash

scriptDir=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
appRootDir=$scriptDir/..
backstageDir=$appRootDir/backstage
source $scriptDir/helpers.sh

start_local() {
	echo "Starting a local PostgreSQL container"
	docker compose -f $appRootDir/config/docker-compose.yml up --build --detach
	echo "Starting the backstage app"
	set -a && source $appRootDir/config/.env && set +a && yarn --cwd $backstageDir dev
	# yarn --cwd $backstageDir dev
	echo "Local dev startup completed"
}

start_local_debug(){  ## Start the backstage app for local development with debugging enabled
	echo "Starting a local PostgreSQL container"
	docker compose -f $appRootDir/config/docker-compose.yml up --build --detach
	echo "Starting the backstage app with debug"
	set -a && source $appRootDir/config/.env && set +a && yarn --cwd ./backstage dev-debug
	$backstageDir/node_modules/.bin/concurrently "yarn --cwd $backstageDir start" "yarn --cwd $backstageDir start-backend --inspect"
	echo "Local dev startup completed"
}

stop_local() {  ## Stop all running processes for local development
	echo "Stopping any local PostgreSQL containers"
	docker compose -f $appRootDir/config/docker-compose.yml down
	echo "PostgreSQL container(s) stopped"
}
