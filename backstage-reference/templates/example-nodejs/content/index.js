const express = require('express')
const app = express()
const port = process.env.PORT || ${{ values.app_port }}

app.get('/', (req, res) => {
  res.send('Hello ${{ values.component_id }} from ${{ values.aws_region }} in account ${{ values.aws_account }}!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})