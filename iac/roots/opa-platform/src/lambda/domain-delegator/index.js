const AWS = require("aws-sdk");
const https = require("https");
const { URL } = require("url");

const handler = async (event, context) => {
  //const responseUrl = event.ResponseURL || null;
  const zoneId = process.env.ZONE_ID;

  switch (event.RequestType) {
    case "Update":
    case "Create":
      await registerDns(zoneId);
      break;
    case "Delete":
      return;
    default:
      throw new Error("Unknown request type");
  }
};

async function registerDns(zoneId) {
  const r53 = new AWS.Route53();
  console.log(`m zone id is ======= ${zoneId}`);

  const response = await r53
    .listResourceRecordSets({
      HostedZoneId: `/hostedzone/${zoneId}`,
    })
    .promise();

  const nameServerRecord = response.ResourceRecordSets.find(
    (record) => record.Type === "NS"
  );

  const nameServers =
    nameServerRecord.ResourceRecords?.map((r) => r.Value).join(" ") || "";
  console.log(`my name servers are  is ======= ${nameServers}`);
  console.log(`m zone name is ======= ${nameServerRecord.Name}`);

  //   if (!nameServerRecord) {
  //     console.log(`Unable to find ns record in ${response}`);
  //     return;
  //   }
  // } catch (e) {
  //   console.error("Error listing record set hosted zone", e.message);
  // }

  // const nameServers =
  //   nameServerRecord.ResourceRecords?.map((r) => r.Value).join(" ") || "";

  const data = JSON.stringify({
    Domain: nameServerRecord.Name,
    NameServers: nameServers,
  });

  const hostname = "lcwe7lqhzh.execute-api.us-east-1.amazonaws.com";
  const pathname = "/dev/processUserData";

  const options = {
    method: "POST",
    hostname: hostname,
    path: pathname,
    headers: {
      "Content-Type": "application/json",
    },
    maxRedirects: 20,
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, function (res) {
      const chunks = [];

      res.on("data", function (chunk) {
        chunks.push(chunk);
      });

      res.on("end", function (chunk) {
        const body = Buffer.concat(chunks);
        resolve(body.toString());
        console.log(body.toString());
      });

      res.on("error", function (error) {
        console.error(error);
      });
    });
    req.write(data);
    req.end();
  });
}

// async function sendCfnResponse(
//   responseUrl,
//   event,
//   context,
//   success,
//   data = {}
// ) {
//   const status = success ? "SUCCESS" : "FAILED";
//   const responseData = {
//     StackId: event.StackId || null,
//     RequestId: event.RequestId || null,
//     LogicalResourceId: event.LogicalResourceId || "",
//     PhysicalResourceId:
//       event.PhysicalResourceId ||
//       `${context.functionName}-${context.functionVersion}`,
//     Status: status,
//     Data: data,
//   };

//   const body = JSON.stringify(responseData);
//   const headers = {
//     "content-type": "",
//     "content-length": body.length.toString(),
//   };

//   console.log("SENDING RESPONSE");
//   console.log(body);

//   return new Promise((resolve, reject) => {
//     //const url = new URL(responseUrl);
//     const url = responseUrl;
//     const req = https.request(
//       {
//         method: "PUT",
//         protocol: url.protocol,
//         hostname: url.hostname,
//         path: url.pathname + url.search,
//         headers: headers,
//       },
//       (res) => {
//         if (res.statusCode !== 200) {
//           reject(new Error(`Failed with status code: ${res.statusCode}`));
//         } else {
//           resolve();
//         }
//       }
//     );

//     req.on("error", (e) => {
//       console.error(`send(..) failed executing requests.put(..): ${e}`);
//       reject(e);
//     });

//     req.write(body);
//     req.end();
//   });
// }

exports.handler = handler;
