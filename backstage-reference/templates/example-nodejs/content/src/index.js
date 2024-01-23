const express = require('express');
const app = express();
const port = ${{ values.appPort }} || '??port??';

app.get('/', (req, res) => {
  res.send('Hello ${{ values.component_id }}!');
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
