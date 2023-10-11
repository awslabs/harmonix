const AWS = require("aws-sdk");
const https = require("https");

const ZONE_ID = process.env.ZONE_ID;
const HOSTNAME = "lcwe7lqhzh.execute-api.us-east-1.amazonaws.com";
const PATHNAME = "/dev/processUserData";

const handler = async (event) => {
  switch (event.RequestType) {
    case "Update":
    case "Create":
      await registerDns(ZONE_ID);
      break;
    case "Delete":
      await deregisterDns(ZONE_ID);
      break;
    default:
      throw new Error("Unknown request type");
  }
};

async function registerDns(zoneId) {
  const r53 = new AWS.Route53();

  const response = await r53
    .listResourceRecordSets({
      HostedZoneId: `/hostedzone/${zoneId}`,
    })
    .promise();

  const nameServerRecord = response.ResourceRecordSets.find((record) => record.Type === "NS");

  if (!nameServerRecord) {
    console.log("No NS record found.");
    return;
  }

  const data = {
    Domain: nameServerRecord.Name,
    NameServers: nameServerRecord.ResourceRecords.map((r) => r.Value).join(" "),
  };

  await sendHttpRequest("POST", data);
}

async function deregisterDns(zoneId) {
  const r53 = new AWS.Route53();

  const response = await r53
    .listResourceRecordSets({
      HostedZoneId: `/hostedzone/${zoneId}`,
    })
    .promise();

  // Delete CNAME records
  const cnameRecords = response.ResourceRecordSets.filter((record) => record.Type === "CNAME");
  for (const record of cnameRecords) {
    await r53
      .changeResourceRecordSets({
        HostedZoneId: `/hostedzone/${zoneId}`,
        ChangeBatch: {
          Changes: [
            {
              Action: "DELETE",
              ResourceRecordSet: record,
            },
          ],
        },
      })
      .promise();
    console.log(`Deleted CNAME record: ${record.Name}`);
  }

  const data = {
    Domain: response.ResourceRecordSets.find((record) => record.Type === "NS")?.Name,
    NameServers: response.ResourceRecordSets.find((record) => record.Type === "NS")
      ?.ResourceRecords.map((r) => r.Value)
      .join(" "),
  };

  if (!data.Domain || !data.NameServers) {
    console.log("No NS record found to delete.");
    return;
  }

  await sendHttpRequest("PATCH", data);
}

function sendHttpRequest(method, data) {
  return new Promise((resolve, reject) => {
    const options = {
      method,
      hostname: HOSTNAME,
      path: PATHNAME,
      headers: {
        "Content-Type": "application/json",
      },
      maxRedirects: 20,
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString();
        console.log(`Response from ${method} request:`, body);
        resolve(body);
      });
      res.on("error", (error) => {
        console.error(`Error in ${method} request:`, error);
        reject(error);
      });
    });

    req.write(JSON.stringify(data));
    req.end();
  });
}

exports.handler = handler;
