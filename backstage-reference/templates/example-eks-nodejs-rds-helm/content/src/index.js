const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const express = require('express')
const app = express()
const port = process.env.PORT || 8080

const { Client } = require("pg")
const appName = "${{ values.component_id }}";

const ENVIRONMENT_NAME = process.env.ENVIRONMENT_NAME || 'Unknown Environment Name'
const DB_SECRET = process.env.DB_SECRET;
const AWS_REGION = process.env.AWS_REGION;
const config = { region: AWS_REGION || 'us-east-1' }
const secretsManagerClient = new SecretsManagerClient(config);

app.get('/error', async (req, res) => {
  throw new Error('Intentional error to demo seeing stack traces in logs');
})

app.get('/health', async (req, res) => {
  res.send('Success');
})

app.get('/', async (req, res) => {
  let apiResponse = `<h1>${appName}</h1><h2>Environment: ${ENVIRONMENT_NAME}</h2><h3>Success</h3><br />Note: the database connection has not yet been configured. (timestamp: ${new Date().toString()})`;

  if (DB_SECRET && AWS_REGION) {
    const client = await connectDb(DB_SECRET, AWS_REGION);
    console.log('Got DB connection!');

    const queryResult = await queryDB(client, 'select now()');

    if (queryResult) {

      let dbOutput = JSON.stringify(queryResult);
      if (queryResult.rowCount === 1 && queryResult.rows) {
        dbOutput = `According to the database, the current date/time is ${queryResult.rows[0].now}`;
      }
      apiResponse = `<h1>${appName}</h1><h2>Environment: ${ENVIRONMENT_NAME}</h2><h3>Database Connection Successful!</h3><br />${dbOutput}`;

    } else {
      apiResponse = `<h1>${appName}</h1><h2>Environment: ${ENVIRONMENT_NAME}</h2><h3>Database Connection Successful!</h3><br />No response data was returned from query.`;
    }
    closeConnection(client);
  }

  res.send(apiResponse);
})

app.listen(port, () => {
  console.log(`Example RDS app listening on port ${port}`)
})

const getSecretValue = async (secretName, region) => {
  console.log(`Retrieving secret: ${secretName} for region: ${region}`);

  let secret;
  let secretValue = await secretsManagerClient.send(
    new GetSecretValueCommand({ SecretId: secretName })
  );
  if (secretValue.SecretString) {
    secret = secretValue.SecretString;
  }
  return secret ? JSON.parse(secret) : secret;
}

const connectDb = async (secret, region) => {
  const secretValues = await getSecretValue(secret, region);
  console.log(`Will attempt to connect to database at ${secretValues.host}`)
  try {
    const client = new Client({
      user: secretValues.username,
      host: secretValues.host,
      database: secretValues.dbname,
      password: secretValues.password,
      port: secretValues.port
    })
    console.log("Making a connection to db...")
    await client.connect()
    console.log("Connected to DB.")
    return client;

  } catch (error) {
    console.log(error)
  }
}

const closeConnection = async (client) => {
  await client.end();
}

const queryDB = async (client, query) => {
  const res = await client.query(query)
  console.log(res)
  return res;
}
