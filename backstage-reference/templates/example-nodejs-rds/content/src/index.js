const AWS = require("aws-sdk")
const express = require('express')
const app = express()
const port = process.env.PORT || 8080

const { Client } = require("pg")

app.get('/', async (req, res) => {
  const DB_SECRET = process.env.DB_SECRET;
  const AWS_REGION = process.env.AWS_REGION;
  const client = await connectDb(DB_SECRET, AWS_REGION)
  console.log('Yes!')

  const queryResult =await queryDB(client, 'select now()')
  if (queryResult)
  {
    res.send(queryResult)
  }
  else
  {
    res.send('Hello world!')
  }
  closeConnection(client);
})

app.listen(port, () => {
  console.log(`Example rds app listening on port ${port}`)
})

const getSecretValue = async (secretName, region) => {
  console.log(secretName)
  console.log(region)
  const config = { region : region }
  let secret;
  let secretsManager = new AWS.SecretsManager(config);
  let secretValue = await secretsManager.getSecretValue({SecretId: secretName}).promise();
  if (secretValue.SecretString) {
    secret = secretValue.SecretString;
  }
  return secret ? JSON.parse(secret) : secret;
}

const connectDb = async (secret, region) => {
  const secretValues = await getSecretValue(secret, region);
  console.log("inside")
  console.log(secretValues)
  try {
      const client = new Client({
          user: secretValues.username,
          host: secretValues.host,
          database: secretValues.dbname,
          password: secretValues.password,
          port: secretValues.port
      })
      console.log("making a connection to db...")
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

const queryDB = async(client, query) => {
  const res = await client.query(query)
  console.log(res)
  return res;
}
