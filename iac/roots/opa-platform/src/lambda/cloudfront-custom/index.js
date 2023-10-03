const AWS = require('aws-sdk');

exports.handler =  async function(event, context) {
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
  const cloudfront = new AWS.CloudFront();
  console.log(cloudfront);
  //cloudfront.getDistribution().promise()
  try
  {
    console.log("HELLLO")
    const response = await cloudfront.getDistribution({ Id: process.env.DISTRIBUTION_ID || "N/A" }).promise();
    console.log("HELLLO22")
    if (response.Distribution) 
    {
      console.log("Found distribution!")
      const params = {
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
