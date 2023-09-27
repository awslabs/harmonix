// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

var AWS = require('aws-sdk');

exports.handler =  async function(event, context) {
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
  var k = AWS.ApiGatewayManagementApi();
  
  var apig = new AWS.ApiGatewayV2();
  try
  {
    console.log("HELLLO")
    var params = {
      Name: 'STRING_VALUE', /* required */
      SubnetIds: [ /* required */
        'STRING_VALUE',
        /* more items */
      ],
      }
    };
    const response = await apig.createVpcLink(params).promise();
    console.log("HELLLO22")
    if (response.Distribution) 
    {
      console.log("Found distribution!")
      var params = {
          Id: process.env.DISTRIBUTION_ID || "N/A",
          DistributionConfig: response.Distribution.DistributionConfig,
          IfMatch: response.ETag
      }
      console.log(response.Distribution.DistributionConfig);
      if (params.DistributionConfig.Origins.Quantity == 1)
      {
        console.log("modify default origin")
        params.DistributionConfig.Origins.Items[0].OriginPath = "/git";
        params.DistributionConfig.Origins.Items[0].DomainName=process.env.DOMAIN_NAME || "N/A"
      }
      else
      {
        console.log("append default origin")

      }
      console.log("Before update")
      const cfResponse = await cloudfront.updateDistribution(params).promise();
      console.log(cfResponse);
    }
    else
    {
      console.err("Error fetching distribution")
    }
  }
  catch(e){
    console.log(e);
  }

}
