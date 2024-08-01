// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// import { PutParameterCommand, SSMClient } from "@aws-sdk/client-ssm"; // ES Modules import
const { SSMClient, PutParameterCommand } = require("@aws-sdk/client-ssm"); // CommonJS import

exports.handler = async function (event) {
  console.log(process.env.SSM_PARAM);
  console.log(process.env.SSM_VALUE);

  switch (event.RequestType) {
    case "Update":
      await updateSSM();
      break;
    case "Create":
      await updateSSM();
      break
    case "Delete": {
      return;
    }
    default: {
      throw new Error("Unknown request type");
    }
  }
};

async function updateSSM() {
  const ssmClient = new SSMClient({ region: process.env.AWS_REGION });
  try {
    const response = await ssmClient.send(
      new PutParameterCommand({
        Name: process.env.SSM_PARAM,
        Value: process.env.SSM_VALUE,
        Overwrite: true,
      })
    );
    if (response) {
      console.log("PARAM UPDATED");
      console.log(response);
    } else {
      console.err("Error Updating Param");
    }
  } catch (e) {
    console.log(e);
  }
}
