// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { InfoCard, MissingAnnotationEmptyState, EmptyState } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { AWSServiceResources } from '@aws/plugin-aws-apps-common';
import { LinearProgress, Typography } from '@material-ui/core';
import React, { useEffect, useState } from 'react';
import { bawsApiRef } from '../../api';
import { ServiceResourcesComponent } from './ServiceComponent';
import { useAsyncAwsApp } from '../../hooks/useAwsApp';

const BawsAppInfraInfo = ({
  input: { account, region, resourceGroupArn }
}: { input: { account: string, region: string, resourceGroupArn: string } }) => {

  const resourceGroupAnnotationName = 'aws.amazon.com/baws-app-resource-group';
  const bawsApi = useApi(bawsApiRef);
  const [rscGroupData, setRscGroupData] = useState<AWSServiceResources>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ isError: boolean; errorMsg: string | null }>({ isError: false, errorMsg: null });
  const [missingAnnotation, setMissingAnnotation] = useState(false);

  // The default set of AWS services to show on the Infrastructure card
  // TODO: this should be externalized to configuration
  const defaultServiceFilter = [
    'ApiGateway',
    'EC2',
    'ECS',
    'EFS',
    'Lambda',
    'Logs',
    'RDS',
    'S3',
    'SecretsManager',
    'SSM',
  ];

  async function getData() {
    // Validate the resource group annotation and extract the resource group name
    // so that we can build a deepLink to the resource group page in the AWS console
    if (!resourceGroupArn) {
      setMissingAnnotation(true);
      throw new Error('Missing resource group annotation');
    }

    const rscGroupResources = await bawsApi.getResourceGroupResources({
      rscGroupArn: resourceGroupArn,
      account,
      region,
    });

    const data = rscGroupResources ?? {};
    setRscGroupData(data);
  }

  useEffect(() => {
    getData()
      .then(() => {
        setLoading(false);
        setError({ isError: false, errorMsg: null });
        setMissingAnnotation(false);
      })
      .catch(e => {
        if (!missingAnnotation) {
          const statusCode = e.body.response.statusCode ?? null;
          const errorMsg = statusCode === 404 ? 'Data not available at this time'
            : `Unexpected error occurred while retrieving resource group data: ${e}`;
          setError({ isError: true, errorMsg });
        }
        setLoading(false);
      });
  }, []);

  const title = 'AWS Infrastructure Resources';
  if (loading) {
    return (
      <InfoCard title={title}>
        <LinearProgress />
        <Typography>Fetching resources...</Typography>
      </InfoCard>
    );
  }
  // Handle the missing annotation sceanrio before getting to the general error state
  if (missingAnnotation) {
    return (
      <InfoCard title={title}>
        <MissingAnnotationEmptyState annotation={resourceGroupAnnotationName} />
      </InfoCard>
    );
  }
  if (error.isError) {
    return <InfoCard title={title}>{error.errorMsg}</InfoCard>;
  }

  return (
    <InfoCard
      title={title}
    // Enable the deepLink attribute to display a link taking the user directly to the Resource Group in the AWS console.
    // deepLink={{
    //   title: 'View All Resources',
    //   link: `https://console.aws.amazon.com/resource-groups/${parsedRscGroupArn?.resource}?region=${parsedRscGroupArn?.region}`,
    // }}
    >
      <ServiceResourcesComponent servicesObject={rscGroupData} serviceFilter={defaultServiceFilter} />
    </InfoCard>
  );
};

export const InfrastructureCard = () => {
  const awsAppLoadingStatus = useAsyncAwsApp();

  if (awsAppLoadingStatus.loading) {
    return <LinearProgress />
  } else if (awsAppLoadingStatus.deployments) {
    const env1 = awsAppLoadingStatus.deployments
      .environments[Object.keys(awsAppLoadingStatus.deployments.environments)[0]];
    const input = {
      account: env1.accountNumber,
      region: env1.region,
      resourceGroupArn: awsAppLoadingStatus.deployments.resourceGroupArn
    };
    return <BawsAppInfraInfo input={input} />
  } else {
    return <EmptyState missing="data" title="No infrastructure data to show" description="Infrastructure data would show here" />
  }
};
