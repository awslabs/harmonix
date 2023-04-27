#!/bin/zsh

# Define helper functions for pretty output
echo_ok()    { echo '\033[1;32m'"$1"'\033[0m'; }
echo_warn()  { echo '\033[1;33m'"$1"'\033[0m'; }
echo_error() { echo '\033[1;31mERROR: '"$1"'\033[0m'; }

ACCOUNT=$(aws sts get-caller-identity --query "Account" --output text)
REGION=$(aws configure get region)
GITLAB_USER_NAME=baws-admin
GITLAB_GROUP_NAME=aws-app

SCRIPT_DIR=${0:a:h}

if [ -z "$ACCOUNT" ] || [ -z "$REGION" ]
then
  echo_error "AWS Account and region must be set.  Please ensure that you're logged in and have valid credentials."
  echo "Exiting..."
  exit
fi

# Confirm that the correct account and region are specified and that the user wants to proceed
echo_warn "This script is very destructive and will delete AWS and Gitlab resources from account ${ACCOUNT} in ${REGION}."
echo_warn "Please ensure that you understand what resources will be cleaned up before continuing.\n"
while true; do
  read -k 1 "yn?Continue [y/n]? "
  case $yn in
    [Yy]* ) echo "\n"; break;;
    [Nn]* ) echo "\nExiting"; exit;;
    * ) echo "\nPlease answer y(es) or n(o).";;
  esac
done

# get the gitlab admin token and hostname from .config/env
eval $(grep "GITLAB_ADMIN_TOKEN" ${SCRIPT_DIR}/../config/.env)
eval $(grep "GITLAB_HOSTNAME" ${SCRIPT_DIR}/../config/.env)

# ############################################
# Checks for Gitlab repositories owned by the GITLAB_USER_NAME and deletes them
# ############################################
echo_ok "\nChecking for repositories owned by the '${GITLAB_USER_NAME}' user at ${GITLAB_HOSTNAME}"
GITLAB_USER_ID=$(curl -s --request GET --header "PRIVATE-TOKEN: ${GITLAB_ADMIN_TOKEN}" "https://${GITLAB_HOSTNAME}/api/v4/users/" | jq ".[] | select(.username == \"${GITLAB_USER_NAME}\") | .id")
REPOS=($(curl -s --request GET --header "PRIVATE-TOKEN: ${GITLAB_ADMIN_TOKEN}" "https://${GITLAB_HOSTNAME}/api/v4/users/${GITLAB_USER_ID}/projects" | jq -r '.[].name' | grep --invert-match "backstage-reference" ) )
if (( ${#REPOS[@]} == 0 )); then
  echo "\tNo repositories found"
else
  echo "Repositories to delete: ${#REPOS[@]}"

  for i in "${REPOS[@]}"
  do
    echo "\tDeleting $i"
    curl -s --request DELETE --header "PRIVATE-TOKEN: ${GITLAB_ADMIN_TOKEN}" "https://${GITLAB_HOSTNAME}/api/v4/projects/${GITLAB_USER_NAME}%2F$i"
  done
fi

# ############################################
# Checks for Gitlab repositories owned by the GITLAB_GROUP_NAME group and deletes them
# ############################################
echo_ok "\nChecking for repositories owned by the '${GITLAB_GROUP_NAME}' group"
GITLAB_GROUP_ID=$(curl -s --request GET --header "PRIVATE-TOKEN: ${GITLAB_ADMIN_TOKEN}" "https://${GITLAB_HOSTNAME}/api/v4/groups" | jq -r ".[] | select(.name == \"${GITLAB_GROUP_NAME}\") | .id")
REPOS=($(curl -s --request GET --header "PRIVATE-TOKEN: ${GITLAB_ADMIN_TOKEN}" "https://${GITLAB_HOSTNAME}/api/v4/groups/${GITLAB_GROUP_ID}/projects" | jq -r '.[].name | select(. != "backstage-reference")'))
# REPOS=("${(@f)$(curl -s --request GET --header "PRIVATE-TOKEN: ${GITLAB_ADMIN_TOKEN}" "https://${GITLAB_HOSTNAME}/api/v4/groups/${GITLAB_GROUP_ID}/projects" | jq -r '.[].name' | grep --invert-match "backstage-reference")}")
echo_ok "\tDeleting ${#REPOS[@]} repositories in group ${GITLAB_GROUP_NAME}"
if (( ${#REPOS[@]} == 0 )); then
  echo "\tNo repositories found"
else
  echo "\tRepositories to delete: ${#REPOS[@]}"

  for i in "${REPOS[@]}"
  do
    echo "\tDeleting $i"
    curl -s --request DELETE --header "PRIVATE-TOKEN: ${GITLAB_ADMIN_TOKEN}" "https://${GITLAB_HOSTNAME}/api/v4/projects/${GITLAB_GROUP_NAME}%2F$i"
  done
fi


# ############################################
# Delete SecretsManager secrets.
# ############################################
echo_ok "\nDeleting 'aws-apps' SecretsManager secrets"
# Delete region replication first
aws secretsmanager list-secrets | jq -r '.SecretList[].ARN' | grep -E  ":aws-apps-" | xargs -n1 -I{} aws secretsmanager remove-regions-from-replication --secret-id {} --remove-replica-regions "us-west-2" --no-cli-pager
# Then delete the actual secret
aws secretsmanager list-secrets | jq -r '.SecretList[].ARN' | grep -E  ":aws-apps-" | xargs -n1 -I{} aws secretsmanager delete-secret --secret-id {} --force-delete-without-recovery --no-cli-pager

# ############################################
# Delete ECR repositories
# ############################################
echo_ok "\nDeleting ECR repositories (that don't start with 'baws' or 'cdk')"
aws ecr describe-repositories | jq -r '.repositories[].repositoryName' | grep -E -v "^baws|imgtest|cdk" | xargs -n1 -I{} aws ecr delete-repository --repository-name {} --force --no-cli-pager

# ############################################
# Delete all CFN stacks which are CREATE_ or UPDATE_COMPLETE and don't start with "baws" or "cdk" (case-insensitive)
# ############################################
STACKS=($(aws cloudformation list-stacks --no-cli-pager | jq -r '.StackSummaries[] | select((.StackStatus == "CREATE_COMPLETE") or (.StackStatus == "UPDATE_COMPLETE")) | .StackName' | grep -v -E -i "(baws|cdk)"))
echo_ok "\nDeleting ${#STACKS[@]} CloudFormation stacks (that don't start with 'baws' or 'cdk')"
if (( ${#STACKS[@]} == 0 )); then
  echo "\tNo stacks found"
else
  echo "\tStacks to delete: ${#STACKS[@]}"
  for i in "${STACKS[@]}"
  do
    echo "\tDeleting $i"
    aws cloudformation delete-stack --stack-name $i --no-cli-pager 
  done
fi
exit

# TODO: Delete old StepFunction execution history

# TODO: Delete old CloudWatch Log Groups

# TODO: Delete inactive ECS task definitions
# *See code below
# #!/bin/bash -e
# 
# die () {
#     echo >&2 "$@"
#     exit 1
# }
# 
# [ "$#" -eq 2 ] || die "2 argument required, $# provided"
# 
# TASKNAME=$1
# START=1 # the first number of the task revision to loop through
# END=$2 # The last number to stop the delete loop at
# 
# # This function will deregister the task definition
# #for (( x=$START; x<=$END; x++ ))
# #do
# #        aws ecs deregister-task-definition --task-definition $TASKNAME:$x --no-cli-pager
# #        sleep 5
# #        echo "The task $TASKNAME and revision $x has been deregistered"
# #done
# 
# # This function will delete the task definition
# for (( y=$START; y<=$END; y++ ))
# do
#         aws ecs delete-task-definitions --task-definition $TASKNAME:$y --no-cli-pager
#         sleep 2
#         echo "The task $TASKNAME and revision $y has been deleted"
# done
