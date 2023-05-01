const express = require('express')
const bodyParser = require('body-parser')
const db = require('./queries')

const app = express()

const port = process.env.PORT || 3000

app.use(bodyParser.json())
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
)

app.get('/', (req, res) => {
    res.json({
      rds_resource_id: "${{ values.rds_resource_id }}",
      region: "${{ values.aws_region }}",
      account: "${{ values.aws_account }}",
      resource_path: "/${{ values.db_object_name }}s"
    });
  });
  
  app.get('/${{ values.db_object_name }}s', db.get${{ values.db_object_name | capitalize }}s)
  app.get('/${{ values.db_object_name }}s/:id', db.get${{ values.db_object_name | capitalize }}ById)
  app.post('/${{ values.db_object_name }}s', db.create${{ values.db_object_name | capitalize }})
  app.put('/${{ values.db_object_name }}s/:id', db.update${{ values.db_object_name | capitalize }})
  app.delete('/${{ values.db_object_name }}s/:id', db.delete${{ values.db_object_name | capitalize }})
  

db.createTable()

app.listen(port, () => {
  console.log(`Example nodejs service listening on port ${port}`)
})

