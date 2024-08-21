// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// import { CloudFrontClient, GetDistributionCommand, UpdateDistributionCommand } from "@aws-sdk/client-cloudfront"; // ES Modules import
const { CloudFrontClient, UpdateDistributionCommand } = require("@aws-sdk/client-cloudfront"); // CommonJS import

exports.handler = async function (event, context) {
  console.log(process.env.DISTRIBUTION_ID);
  console.log(process.env.DOMAIN_NAME);

  switch (event.RequestType) {
    case 'Update':
      await updateCDN();
      break;
    case 'Create':
      await updateCDN();
      break;
    case 'Delete': {
      break;
    }
    default: {
      throw new Error('Unknown request type');
    }
  }
};

async function updateCDN() {
  var cloudfront = new CloudFrontClient({ region: process.env.AWS_REGION });

  console.log(cloudfront);

  try {
    console.log("HELLLO")
    const command = new GetDistributionCommand({ Id: process.env.DISTRIBUTION_ID || "N/A" });
    const response = await client.send(command);


    console.log("HELLLO22")
    if (response.Distribution) {
      console.log("Found distribution!")
      const params = {
        Id: process.env.DISTRIBUTION_ID || "N/A",
        DistributionConfig: response.Distribution.DistributionConfig,
        IfMatch: response.ETag
      }
      console.log(response.Distribution.DistributionConfig);
      if (params.DistributionConfig.Origins.Quantity == 1) {
        console.log("modify default origin")
        params.DistributionConfig.Origins.Items[0].OriginPath = "/git";
        params.DistributionConfig.Origins.Items[0].DomainName = process.env.DOMAIN_NAME || "N/A"
      }
      else {
        console.log("append default origin")

      }
      console.log("Before update")

      const updateDistCommand = new UpdateDistributionCommand(params);
      const cfResponse = await client.send(updateDistCommand);
      console.log(cfResponse);
    }
    else {
      console.err("Error fetching distribution")
    }
  }
  catch (e) {
    console.log(e);
  }

}
