cd $CI_PROJECT_DIR/.awsdeployment
set -a && source resource-binding-params-temp.properties && set +a
git rm resource-binding-params-temp.properties
echo "Processing Resource $RESOURCE_ENTITY"
echo "Processing ResourceRef $RESOURCE_ENTITY_REF"
cd $CI_PROJECT_DIR/.backstage
ALREADY_DEPENDS_ON="$(grep "$RESOURCE_ENTITY_REF" catalog-info.yaml || true)"
if ! [[ -z "$ALREADY_DEPENDS_ON" ]]; then yq -Yi "del(.spec.dependsOn[] | select(. ==\"${RESOURCE_ENTITY_REF}\"))" catalog-info.yaml; fi
cat catalog-info.yaml
git add $CI_PROJECT_DIR/.backstage/catalog-info.yaml
git add catalog-info.yaml

UPDATE_COUNT=$(git diff --cached --numstat | wc -l | sed 's/ *$//g')
echo "The number of files that will be committed is $UPDATE_COUNT"
git status
if [[ "$UPDATE_COUNT" -gt "0" ]]; then git commit -m "unBind Resource to env ${TARGET_ENV_NAME}-${TARGET_ENV_PROVIDER_NAME}" --quiet; fi
if [[ "$UPDATE_COUNT" -gt "0" ]]; then git push -o ci.skip https://oauth2:$ACCESS_TOKEN@$CI_SERVER_HOST/$CI_PROJECT_NAMESPACE/$CI_PROJECT_NAME HEAD:main; fi
