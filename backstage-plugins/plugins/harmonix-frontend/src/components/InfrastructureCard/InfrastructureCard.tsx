// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { InfoCard, EmptyState } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { AWSComponent, AWSComponentType, AWSECSAppDeploymentEnvironment, AWSServiceResources, AWSResourceDeploymentEnvironment } from '@aws/plugin-aws-apps-common-for-backstage';
import { LinearProgress, Typography } from '@material-ui/core';
import React, { useEffect, useState } from 'react';
import { opaApiRef } from '../../api';
import { ServiceResourcesComponent } from './ServiceComponent';
import { useAsyncAwsApp } from '../../hooks/useAwsApp';
import { ProviderType } from '../../helpers/constants';

const OpaAppInfraInfo = ({
  input: { resourceGroupArn, awsComponent }
}: { input: { resourceGroupArn: string, awsComponent: AWSComponent } }) => {

  const api = useApi(opaApiRef);

  const [rscGroupData, setRscGroupData] = useState<AWSServiceResources>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ isError: boolean; errorMsg: string | null }>({ isError: false, errorMsg: null });


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

  if (ProviderType.EKS === awsComponent.currentEnvironment.providerData.providerType) {
    defaultServiceFilter.push('ElasticLoadBalancingV2');
    defaultServiceFilter.push('ECR');
  }

  async function getData() {
    // Validate the resource group annotation and extract the resource group name
    // so that we can build a deepLink to the resource group page in the AWS console
    if (!resourceGroupArn) {
      throw new Error('Missing resource group arn');
    }

    const rscGroupResources = await api.getResourceGroupResources({
      rscGroupArn: resourceGroupArn
    });

    const data = rscGroupResources ?? {};
    setRscGroupData(data);
  }

  useEffect(() => {
    getData()
      .then(() => {
        setLoading(false);
        setError({ isError: false, errorMsg: null });
      })
      .catch(e => {
        const statusCode = e.body.response.statusCode ?? null;
        const errorMsg = statusCode === 404 ? 'Data not available at this time'
          : `Unexpected error occurred while retrieving resource group data: ${e}`;
        setError({ isError: true, errorMsg });
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
      <ServiceResourcesComponent servicesObject={rscGroupData} serviceFilter={defaultServiceFilter}
        prefix={awsComponent.currentEnvironment.providerData.prefix} providerName={awsComponent.currentEnvironment.providerData.name} />
    </InfoCard>
  );
};

export const InfrastructureCard = () => {
  const awsAppLoadingStatus = useAsyncAwsApp();

  if (awsAppLoadingStatus.loading) {
    return <LinearProgress />
  } else if (awsAppLoadingStatus.component) {
    let input = undefined;
    if (awsAppLoadingStatus.component.componentType === AWSComponentType.AWSApp) {
      const env = awsAppLoadingStatus.component.currentEnvironment as AWSECSAppDeploymentEnvironment;
      input = {
        resourceGroupArn: env.app.resourceGroupArn,
        awsComponent: awsAppLoadingStatus.component
      };
    }
    else if (awsAppLoadingStatus.component.componentType === AWSComponentType.AWSResource) {
      const env = awsAppLoadingStatus.component.currentEnvironment as AWSResourceDeploymentEnvironment;
      input = {
        resourceGroupArn: env.resource.resourceGroupArn,
        awsComponent: awsAppLoadingStatus.component
      };
    }
    else {
      throw new Error("Infrastructure Card Not yet implemented!")
    }
    return <OpaAppInfraInfo input={input} />
  } else {
    return <EmptyState missing="data" title="No infrastructure data to show" description="Infrastructure data would show here" />
  }
};
