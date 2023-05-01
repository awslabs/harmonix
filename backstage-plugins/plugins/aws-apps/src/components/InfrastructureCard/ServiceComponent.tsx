// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { SubvalueCell, Table, TableColumn } from '@backstage/core-components';
import { AWSResource, AWSServiceResources } from '@internal/plugin-aws-apps-common';
import { makeStyles, Typography } from '@material-ui/core';
import { Link } from '@mui/material';
import React, { useState, useCallback } from 'react';
import { ResourceDetailsDialog } from './ResourceDetailsDialog';

// Declare styles to use in the components
const useStyles = makeStyles(theme => ({
  container: {
    // width: 450,
  },
  serviceTableIdentifier: {
    padding: theme.spacing(2),
    'font-weight': 'bold',
    'font-size': '1.3em',
  },
  closeButton: {
    position: 'absolute',
    right: theme.spacing(1),
    top: theme.spacing(1),
    color: theme.palette.grey[500],
  },
  empty: {
    padding: theme.spacing(2),
    display: 'flex',
    justifyContent: 'center',
  },
}));

/**
 * A UI component providing a 'details' link.  When the link is clicked, it
 * will open a dialog displaying details for the associated AWS Resource
 *
 * @param resource The AWS resource type requiring a link to display its details.
 * @returns JSXElement
 */
const CustomDetailsLink = ({ resource }: { resource: AWSResource }) => {
  const [open, setOpen] = useState(false);

  const openDialog = () => {
    setOpen(true);
  };
  const closeDialog = () => setOpen(false);

  return (
    <>
      <Link component="button" underline="hover" onClick={openDialog}>
        details
      </Link>
      <ResourceDetailsDialog resource={resource} isOpen={open} closeDialogHandler={closeDialog} />
    </>
  );
};

/**
 * A UI component to display an AWS service and a table of it's resources.
 *
 * @param serviceName An optional short string describing the AWS service.  If the serviceName is provided, then it will be used in the header of the table; otherwise, it will not be displayed.
 * @param resources An array of AWS resource objects which below to the specified serviceName
 * @returns JSXElement rendering a table for an AWS service and its resources
 */
export const DenseResourceTable = ({ serviceName, resources }: { serviceName?: string; resources: AWSResource[] }) => {
  const classes = useStyles();

  const preventRerender = useCallback((row: any): React.ReactNode => <SubvalueCell value={row.resourceName} subvalue={row.subvalue} />, []);

  // Table column definition used for displaying key/value pairs of resource type and resource name
  const columns: TableColumn[] = [
    {
      title: 'Type',
      field: 'resourceType',
      highlight: true,
      type: 'string',
      width: '30%',
    },
    {
      title: 'Name',
      field: 'resourceName',
      type: 'string',
      render: preventRerender,
    },
  ];

  const resourceItems = resources.map((r, i) => {
    // Array of resource types which should include a 'details' subvalue
    // for the user to request details about the resource
    // TODO: this should be redesigned to make the specification of "detail" resources more dynamic.
    const detailTypes = ['AWS::SecretsManager::Secret', 'AWS::SSM::Parameter'];

    // subvalue is a details link to be shown beneath a table cell value
    const subvalue = detailTypes.includes(r.resourceTypeId) ? <CustomDetailsLink key={i} resource={r} /> : undefined;

    return {
      id: i,
      resourceTypeId: r.resourceTypeId,
      resourceType: r.resourceTypeName,
      resourceName: r.resourceName,
      subvalue,
    };
  });

  // return the JSXElement for the table displaying AWS resources for a service
  return (
    <div className={classes.container}>
      <Table
        options={{
          paging: false,
          padding: 'dense',
          search: false,
          showTitle: true,
          header: false,
          toolbar: !!serviceName,
        }}
        data={resourceItems}
        columns={columns}
        title={serviceName}
      />
    </div>
  );
};

/**
 * A UI component to display an AWS service name and a table of its associated resources
 *
 * @param serviceName A short string describing the AWS service.
 * @param resources An array of AWS resource objects which below to the specified serviceName
 */
const Service = ({ serviceName, resources }: { serviceName: string; resources: AWSResource[] }) => {
  const classes = useStyles();

  return (
    <>
      <Typography className={classes.serviceTableIdentifier}>{serviceName}</Typography>
      <DenseResourceTable resources={resources} />
    </>
  );
};

/**
 * A UI component to display a list of AWS services and associated resources for each service
 *
 * @param servicesObject an AWSServiceResources type providing a set of services and associated AWS resources to display
 * @param serviceFilter an optional array of service identifier strings which should be displayed.  Service strings should match the service name used in AWS Cloudformation syntax (e.g. "AWS::ServiceName::ResourceType"). If an empty array is provided or the parameter is not provided, then all available services will be displayed.
 * @returns
 */
export const ServiceResourcesComponent = ({
  servicesObject,
  serviceFilter = [],
}: {
  servicesObject: AWSServiceResources;
  serviceFilter?: string[];
}) => {
  const svcKeys = Object.keys(servicesObject);
  const filteredKeys = serviceFilter.length == 0 ? svcKeys : serviceFilter.filter(value => svcKeys.includes(value));

  filteredKeys.sort();
  const serviceItems = filteredKeys.map((serviceName, i) => {
    return <Service key={i} serviceName={serviceName} resources={servicesObject[serviceName]} />;
  });

  return <>{serviceItems}</>;
};
