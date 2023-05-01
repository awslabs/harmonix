start_local() {
	echo "Starting a local PostgreSQL container"
	docker-compose -f ./backstage/docker-compose.yml up --build --detach
	echo "Starting the backstage app"
	set -a && source ./config/.env && set +a && yarn --cwd ./backstage dev
	echo "Local dev startup completed"
}

start_local_debug(){  ## Start the backstage app for local development with debugging enabled
	echo "Starting a local PostgreSQL container"
	docker-compose -f ./backstage/docker-compose.yml up --build --detach
	echo "Starting the backstage app"
	set -a && source ./config/.env && set +a && yarn --cwd ./backstage dev-debug
	echo "Local dev startup completed"
}

stop_local() {  ## Stop all running processes for local development
	echo "Stopping any local PostgreSQL containers"
	docker-compose -f ./backstage/docker-compose.yml down
	echo "PostgreSQL container(s) stopped"
}