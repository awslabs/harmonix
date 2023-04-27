// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

"use strict";
import AWS from "aws-sdk";

export class HostedZoneManager {
  /**
   * Uses AWS Secrets Manager to retrieve a secret
   */
  static async checkHostedZone(hostedZone: string, region: string) {
    const config = { region: region };
    let route53Client = new AWS.Route53(config);

    console.log("checking for existing hosted zones");
    try {
      let result = await route53Client.listHostedZones({}).promise();

      //console.log(result)
      for (let i = 0; i < result.HostedZones.length; i++) {
        let zone = result.HostedZones[i];
        console.log(zone.Name);
        //slice(0,-1) to match zone ends with .(dot)
        if (hostedZone == zone.Name || hostedZone == zone.Name.slice(0, -1)) {
          console.log(`Found HostedZone ${hostedZone}`);
          return true;
        }
      }
    } catch (err) {
      if (err instanceof Error) {
        console.error(`Error retrieving ${hostedZone}: [${err.name}] ${err.message}`);
      }
      throw err;
    }
    return false;
  }
}
