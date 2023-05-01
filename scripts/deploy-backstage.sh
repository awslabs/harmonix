set -o pipefail # FAIL FAST
source ./scripts/helpers.sh
shopt -s expand_aliases

set_env
AWS_ACCOUNT_ID=$CURR_AWS_ACCOUNT
echo "Deploying the backstage backend container";
# TODO: proper versioning for build tag CODEBUILD_RESOLVED_SOURCE_VERSION identifier tag
DATE_TAG=$(date -u +%Y%m%d-%H%M)
docker tag backstage:latest $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/baws-backstage:$DATE_TAG
docker tag backstage:latest $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/baws-backstage:latest
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com
docker push $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/baws-backstage:$DATE_TAG
docker push $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/baws-backstage:latest
