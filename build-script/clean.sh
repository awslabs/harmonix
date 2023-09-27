#!/usr/bin/env bash

scriptDir=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
iacDir=$scriptDir/../iac/roots
source $scriptDir/helpers.sh

echo "Starting clean"
rm -rf $backstageDir/dist-types \
{$backstageDir,$iacDir}/node_modules \
$backstageDir/packages/{app,backend}/{node_modules,dist} \
$backstageDir/plugins/{node_modules,dist} \
$iacDir/**/{node_modules,cdk.out,dist} \
git-temp/
echo "Finished clean"