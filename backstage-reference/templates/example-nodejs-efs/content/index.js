const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");

const app = express();
const port = process.env.PORT || 3000;
const serviceEndpoint = "/journals";

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

const journalPath = process.env.NODE_ENV === "development" ? `${process.env.HOME}/journal` : "/data/journal";

// Create the journal directory if it does not exist
console.log(`Creating journal directory at ${journalPath}`);
fs.mkdir(journalPath, { recursive: true }, (err, data) => {
  if (err) {
    console.log(err);
  }
});

// List journal files
app.get(serviceEndpoint, (req, res) => {
  console.log(`listing journals at: ${journalPath}`);

  fs.readdir(journalPath, (err, files) => {
    if (err) {
      return res.status(500).send(err); // Return error if directory reading failed
    }
    res.send(files); // Return list of files
  });
});

// Read the contents of a specific journal file
app.get(`${serviceEndpoint}/:id`, (req, res) => {
  const journalId = req.params.id; // Get file id from request parameters
  console.log(`reading content from journalId: ${journalId}`);
  fs.readFile(`${journalPath}/${journalId}`, "utf8", (err, data) => {
    if (err) {
      return res.status(500).send(err); // Return error if file reading failed
    }
    res.type("text/plain"); // Set content type to plain text
    res.send(data); // Return file content
  });
});

// Create a new journal file
app.post(`${serviceEndpoint}/:id`, (req, res) => {
  const journalId = req.params.id;
  const filePath = `${journalPath}/${journalId}`;
  console.log(`creating new journal at: ${filePath}`);
  const fileContent = `Journal created:  ${new Date().toISOString()}\n-----------------------------------------\n`; // Get file content from request body
  fs.writeFile(filePath, fileContent, (err) => {
    if (err) {
      return res.status(500).send(err); // Return error if file writing failed
    }
    res.status(201).send(`File ${journalId} created successfully`); // Return success message
  });
});

// Append content to an existing journal file
app.put(`${serviceEndpoint}/:id`, (req, res) => {
  const journalId = req.params.id;
  const filePath = `${journalPath}/${journalId}`;
  const textToAppend = req.body.content;
  console.log(`appending content to journalId: ${journalId}`);
  const fileContent = `${new Date().toISOString()}: ${textToAppend}\n`;
  fs.appendFile(filePath, fileContent, (err) => {
    if (err) {
      return res.status(500).send(err); // Return error if file appending failed
    }
    res.send(`File ${journalId} appended successfully`); // Return success message
  });
});

// Delete a journal file
app.delete(`${serviceEndpoint}/:id`, (req, res) => {
  const journalId = req.params.id;
  const filePath = `${journalPath}/${journalId}`;
  console.log(`deleting journalId: ${journalId}`);
  fs.unlink(filePath, (err) => {
    if (err) {
      return res.status(500).send(err); // Return error if file deleting failed
    }
    res.send(`File ${journalId} deleted successfully`); // Return success message
  });
});

// Return basic information about the EFS resource and application, including the resource ID, region, account, and resource path.
// The resource path is the path to the EFS resource. For example, if the resource ID is "efs-journal" and the resource path is "/journal", then the resource path is "/journal".
app.get("/", (req, res) => {
  const resObject = {
    hostname: process.env.HOSTNAME,
    efs_resource_id: ${{ values.aws_efs_bp_outputs['baws-efs-id'] | dump }},
    region: ${{ values.aws_region | dump }},
    account: ${{ values.aws_account | dump }},
    resource_path: serviceEndpoint,
  };

  // check access to the user's home directory
  // const homeAccess = new Promise((resolve, reject) => {
  fs.access(journalPath, fs.constants.R_OK | fs.constants.W_OK, (err) => {
    resObject.filesystemAccess = !err;
    if (err) {
      resObject.err = err.message;
      console.log(err);
    }
    res.json(resObject);
    
  });
});

app.listen(port, () => {
  console.log(`Example nodejs service listening on port ${port}`);
});
