// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { EmptyState } from '@backstage/core-components';
import { LinearProgress } from '@material-ui/core';
import { useAsyncAwsApp } from '../../hooks/useAwsApp';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';

import FormControl from '@mui/material/FormControl';
import { AWSComponent } from '@aws/plugin-aws-apps-common-for-backstage';

const EnvironmentSelector = ({
  input: { awsComponent },
}: {
  input: { awsComponent: AWSComponent };
}) => {
  const [selectedEnv, setSelectedEnv] = useState(`${awsComponent.currentEnvironment.environment.name}|${awsComponent.currentEnvironment.providerData.name}`);

  const selectorItems = Object.keys(awsComponent.environments).map(env => {
    // Note that the environments keys have been lower-cased so we get the
    // case-sensitive environment name here
    const envName = awsComponent.environments[env].environment.name;
    
    const key = `${envName}|${awsComponent.environments[env].providerData.name}`;
    // if (awsComponent.environments[env].providerData.length>1) TODO: Pretty name for single provider environments
    const title = envName; //- awsComponent.environments[env].providerData.name;
    return (<MenuItem key={"ID-" + key} value={key}>{title}</MenuItem>)
  });

  const handleChange = (event: SelectChangeEvent) => {
    const [envName, providerName] = event.target.value.split('|');
    awsComponent.setCurrentProvider(envName, providerName);
    setSelectedEnv(`${envName}|${providerName}`);
  };

  return (
    <div>
      <FormControl sx={{ m: 1, minWidth: 120, }}>
        <InputLabel id="lbl-select-aws-environment">Environments</InputLabel>
        <Select
          labelId="select-aws-environment"
          id="select-aws-environment"
          value={selectedEnv}
          label="Environments"
          onChange={handleChange}
        >
          {selectorItems}
        </Select>
      </FormControl>
    </div>
  );
};

// Extract information from hook and populate the drop down
export const EnvironmentSelectorWidget = () => {
  const awsAppLoadingStatus = useAsyncAwsApp();

  if (awsAppLoadingStatus.loading) {
    return <LinearProgress />;
  } else if (awsAppLoadingStatus.component) {
    const input = {
      awsComponent: awsAppLoadingStatus.component,
    };
    return <EnvironmentSelector input={input} />;
  } else {
    return <EmptyState missing="data" title="No environment data to show" description="Environments data would show here" />;
  }
};
