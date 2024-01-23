const express = require('express');
const os = require('os');
const app = express();
const port = ${{ values.appPort }};

app.get('/', (req, res) => {
  // TODO: build the response object to return to the user
  res.status(200).send("OK");
});

/**
 * Health endpoint function
 * 
 * @returns a json object with data points reflecting the health of the service including
 *  - service uptime
 *  - os uptime
 *  - a status indicator
 */
app.get('/health', (req, res) => {
  res.json({
    "uptime": process.uptime(),
    "os_uptime": os.uptime(),
    "status": "OK"
  });
})


app.listen(port, () => {
  console.log(`Example microservice listening on port ${port}`)
});
