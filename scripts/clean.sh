echo "Starting clean"
rm -rf backstage/dist-types \
{backstage,cicd,infrastructure}/node_modules \
backstage/packages/{app,backend}/{node_modules,dist} \
{cicd,infrastructure}/cdk.out
echo "Finished clean"