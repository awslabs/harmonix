// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as fs from "fs";
import * as path from "path";
import { HostedZoneManager } from "./hosted-zone";
import AWS from "aws-sdk";
const yaml = require("js-yaml");
const _ = require("lodash");

export interface OktaConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly audience: string;
  readonly authServerId: string;
  readonly idp: string;
  readonly apiToken: string;
}

export interface BackstageInfraConfig {
  readonly AppPrefix: string;
  readonly Account: string;
  readonly Region: string;
  readonly ReplicaRegion: string;
  readonly OktaConfigSecret: string;
  readonly DbConfigSecret: string;
  readonly GitlabSecret: string;
  readonly GitlabAmi: string;
  readonly OktaConfig: OktaConfig;
  readonly R53HostedZoneName: string;
  readonly AllowedIPs: string[];
  readonly CustomerName: string;
  readonly CustomerLogo: string;
  readonly CustomerLogoIcon: string;
  Branch?: string;
}

export async function getConfig(account: string | undefined): Promise<BackstageInfraConfig> {
  let unparsedConfig = yaml.load(fs.readFileSync(path.resolve("./config.yaml"), "utf8"));
  let localConfig = {};
  try {
    // Load a local config file.  The contents of this file will be merged onto config.yaml
    if (account) {
      const yamlPath = path.resolve(`./config.${account}.local.yaml`)
      const fileContents = fs.readFileSync(yamlPath, "utf-8");
      localConfig = yaml.load(fileContents);
    }
  } catch (err) {
    // Ignore - file likely doesn't exist
  }
  let mergedConfig = _.merge(unparsedConfig, localConfig);

  let oktaConfig: OktaConfig = {
    audience: "",
    clientId: "",
    clientSecret: "",
    authServerId: "",
    idp: "",
    apiToken: "",
  };
  if ("OktaConfigSecret" in mergedConfig) {
    let oktaSecretConfig = null;
    let hostedZone = null;
    try {
      let secretsManager = new AWS.SecretsManager({ region: mergedConfig["Region"] });

      let secretValue = await secretsManager.getSecretValue({ SecretId: mergedConfig["OktaConfigSecret"] }).promise();
      oktaSecretConfig = JSON.parse(secretValue.SecretString || "{}");

      // Check if hosted zone exist, if not exit!
      hostedZone = await HostedZoneManager.checkHostedZone(mergedConfig["R53HostedZoneName"], mergedConfig["Region"]);
    } catch (e) {
      console.log("Error fetching Config!!");
      if (e instanceof Error) {
        console.log(`error message: ${e.message}`);
      }
    }
    if (hostedZone == false) {
      throw new Error(
        `Can't find ${mergedConfig["R53HostedZoneName"]} hosted zone, please configure hostedzone in the account`
      );
    }
    if (!oktaSecretConfig) {
      console.log("Can't fetch Config");
    } else {
      // console.log(data)
      oktaConfig = {
        audience: oktaSecretConfig["audience"],
        clientId: oktaSecretConfig["clientId"] || "",
        clientSecret: oktaSecretConfig["clientSecret"],
        authServerId: oktaSecretConfig["authServerId"],
        idp: oktaSecretConfig["idp"],
        apiToken: oktaSecretConfig["apiToken"],
      };
    }
    let config: BackstageInfraConfig = {
      AppPrefix: mergedConfig["AppPrefix"],
      Account: mergedConfig["Account"],
      Region: mergedConfig["Region"],
      ReplicaRegion: mergedConfig["ReplicaRegion"],
      OktaConfigSecret: mergedConfig["OktaConfigSecret"],
      DbConfigSecret: mergedConfig["DbConfigSecret"],
      GitlabSecret: mergedConfig["GitlabSecret"],
      GitlabAmi: mergedConfig["GitlabAmi"],
      R53HostedZoneName: mergedConfig["R53HostedZoneName"],
      OktaConfig: oktaConfig,
      AllowedIPs: mergedConfig["AllowedIPs"],
      CustomerName: mergedConfig["CustomerName"] ?? "AWS",
      CustomerLogo: mergedConfig["CustomerLogo"] ?? "https://companieslogo.com/img/orig/AMZN_BIG-accd00da.png" ,
      CustomerLogoIcon: mergedConfig["CustomerLogoIcon"] ?? "https://companieslogo.com/img/orig/AMZN.D-13fddc58.png",
    };
    return config;
  } else {
    throw new Error("OktaConfigSecret not defined");
  }
}
