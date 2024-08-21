// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// import { ApiGatewayV2Client, CreateVpcLinkCommand } from "@aws-sdk/client-apigatewayv2"; // ES Modules import
const { ApiGatewayV2Client, CreateVpcLinkCommand } = require("@aws-sdk/client-apigatewayv2"); // CommonJS import

exports.handler = async function (event, context) {
  console.log(process.env);

  switch (event.RequestType) {
    case 'Update':
      await updateAPGW();
    case 'Create':
      await updateAPGW();
    case 'Delete': {
      return;
    }
    default: {
      throw new Error('Unknown request type');
    }
  }
};

async function updateAPGW() {

  var apig = new ApiGatewayV2Client({ region: process.env.AWS_REGION });

  try {
    console.log("HELLLO")
    var params = {
      Name: 'STRING_VALUE', /* required */
      SubnetIds: [ /* required */
        'STRING_VALUE',
        /* more items */
      ],
    };
    const command = new CreateVpcLinkCommand(params);
    const response = await apig.send(command);

    console.log("HELLLO22")

  } catch (e) {
    console.log(e);
  }

}

