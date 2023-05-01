// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as AWS from "aws-sdk";
import { S3 } from "aws-sdk";

export const handler = async (event: any) => {
  const executionName = event.Name; // Assuming the execution ID is passed as an argument

  // Create a new S3 client
  const s3 = new AWS.S3();

  // Set up the parameters for the listObjectsV2 method
  const params: S3.Types.ListObjectsV2Request = {
    Bucket: process.env.S3_BUCKET!,
    Prefix: `executions/${executionName}/`, // The prefix to search for - this assumes that all JSON files are stored in subdirectories with the execution ID as the parent folder
    Delimiter: "/", // Use a delimiter to only return keys up to the next folder level
  };

  // Use the listObjectsV2 method to get a list of all folders with the given prefix
  const folders = await s3.listObjectsV2(params).promise();

  // Extract the prefixes of all subdirectories under the execution ID
  const folderPrefixes = folders.CommonPrefixes?.map((obj) => obj.Prefix);
  if (!folderPrefixes) throw new Error("Returned undefined");

  // Create an array of Promises that search each subdirectory for JSON files
  const jsonPromises = folderPrefixes.map(async (prefix) => {
    const subParams: S3.Types.ListObjectsV2Request = {
      Bucket: process.env.S3_BUCKET!,
      Prefix: prefix, // The prefix to search for is the subdirectory prefix
    };
    const s3Objects = await s3.listObjectsV2(subParams).promise();
    const jsonKeys = s3Objects.Contents?.filter((obj) => obj.Key?.endsWith(".json")).map((obj) => obj.Key); // Extract the keys of all JSON files in the subdirectory
    const jsonPromises = jsonKeys?.map(async (key) => {
      const jsonFile = await s3.getObject({ Bucket: process.env.S3_BUCKET!, Key: key! }).promise();
      const keySplit = key!.split("/");
      return { [keySplit[keySplit.length - 2]]: JSON.parse(jsonFile.Body!.toString()) }; // Parse the JSON data
    });
    return Promise.all(jsonPromises!); // Wait for all Promises to resolve, and return the JSON data
  });

  // Wait for all Promises to resolve, and parse the JSON data
  const jsonData = await Promise.all(jsonPromises);

  // Return the combined JSON data
  return jsonData.flat();
};
