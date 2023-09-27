// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface CustomConstructProps extends cdk.StackProps {
  envParams: {
    [key: string]: string;
  };
  foldername: string;
}

const defaultProps: Partial<CustomConstructProps> = {};

/**
 * Deploys the Custom construct
 */
export class CustomConstruct extends Construct {
  constructor(parent: Construct, name: string, props: CustomConstructProps) {
    super(parent, name);

    /* eslint-disable @typescript-eslint/no-unused-vars */
    props = { ...defaultProps, ...props };

    const serviceToken = cdk.CustomResourceProvider.getOrCreate(this, "Custom::Resource-" + name, {
      codeDirectory: `${__dirname}/../lambda/${props.foldername}`,
      runtime: cdk.CustomResourceProviderRuntime.NODEJS_18_X,
      description: "Lambda function for custom resource provider " + name,
      environment: props.envParams,
      // environment:{
      //     "DISTRIBUTION_ID": props.distributionID,
      //     "DOMAIN_NAME": props.domainName
      // },
      policyStatements: [
        {
          Effect: "Allow",
          Action: "*",
          Resource: "*",
        },
      ],
    });

    new cdk.CustomResource(this, "MyResource-" + name, {
      resourceType: "Custom::" + name,
      serviceToken: serviceToken,
    });
  }
}
