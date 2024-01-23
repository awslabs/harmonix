# CDK project for Backstage AWS Application ECS resources

This project will create:
- An ECR repository for the container image of an AWS application deployed to Fargate ECS
- A Fargate Task Definition and ECS Service (fronted by ALB) for the AWS application
- A resource group that helps identify all of the resources created for the application
