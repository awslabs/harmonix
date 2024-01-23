# instructions
To use this Node.JS with RDS App follow the below steps

1. Bind your app to an RDS Database - use the binding feature under Management-> Bind Resource-> Add
2. Once binding completed - you should see the rds database bound in your "bound resource"
3. Go to the DB Resource entity page and copy the secret name of the DB
4. Within your app - using the environment variables in your overview tab set the below two variables:
   1. DB_SECRET=YourDBSecretHere
   2. AWS_REGION=YourDBRegion - i.e: us-east-1
5. Start your app, you should be able to connect to the database and execute queries.