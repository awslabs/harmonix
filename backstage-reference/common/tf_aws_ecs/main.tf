locals {
  environment_identifier = "${var.TARGET_ENV_NAME}-${var.PREFIX}-${var.TARGET_ENV_PROVIDER_NAME}-${var.APP_NAME}"
  tag_key = "aws-apps:${local.environment_identifier}"
  environment_identifier_path = "${var.TARGET_ENV_NAME}/${var.PREFIX}/${var.TARGET_ENV_PROVIDER_NAME}/${var.APP_NAME}"
}

provider "aws" {
  region = var.REGION
  default_tags {
    tags = {
      "${local.tag_key}" = var.APP_NAME
    }
  }
}

# Add resource group for the app
resource "aws_resourcegroups_group" "taskResourceGroup" {
  name ="${var.APP_NAME}-${var.TARGET_ENV_PROVIDER_NAME}-rg"
  description = "Resource related to ${var.APP_NAME}"
  resource_query {
    query = jsonencode(
{
  "ResourceTypeFilters": [
    "AWS::AllSupported"
  ],
  "TagFilters": [
    {
      "Key": "${local.tag_key}"
    }
  ]
}
    )
  }
}

# Create encryption key
resource "aws_kms_key" "kmsKey" {
  description = "Key for ${var.APP_NAME}"
  enable_key_rotation = true
}

# Add an alias to the key
resource "aws_kms_alias" "keyAlias" {
  name          = "alias/${local.environment_identifier}-key-alias"
  target_key_id = aws_kms_key.kmsKey.key_id
}

# Create ECR repo for the app image
resource "aws_ecr_repository" "ecrRepository" {
  name                 = lower("${var.APP_NAME}-${var.TARGET_ENV_NAME}-${var.TARGET_ENV_PROVIDER_NAME}")
  image_tag_mutability = "MUTABLE"
  encryption_configuration {
    encryption_type = "KMS"
    kms_key = aws_kms_key.kmsKey.arn
  }
  image_scanning_configuration {
    scan_on_push = true
  }
  force_delete = true
}

# create a log group for the task
resource "aws_cloudwatch_log_group" "taskLogGroup" {
  name = "/aws/apps/${local.environment_identifier_path}"
}

# create task role
resource "aws_iam_role" "ecs_task_role" {
  name = "${local.environment_identifier}-ecs-task-role"
  assume_role_policy = <<EOF
{
 "Version": "2012-10-17",
 "Statement": [
   {
     "Action": "sts:AssumeRole",
     "Principal": {
       "Service": "ecs-tasks.amazonaws.com"
     },
     "Effect": "Allow",
     "Sid": ""
   }
 ]
}
EOF
}

resource "aws_iam_role" "ecsTaskExecutionRole" {
  name               = "${local.environment_identifier}-ecs-exec-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role_policy.json
}

resource "aws_iam_role_policy_attachment" "cw-attach" {
  role       = aws_iam_role.ecsTaskExecutionRole.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess"
}

data "aws_iam_policy_document" "assume_role_policy" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy_attachment" "ecs-task-execution-role-policy-attachment" {
  role       = aws_iam_role.ecsTaskExecutionRole.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# grant access to kms 
resource "aws_kms_grant" "taskRoleGrant" {
  name              = "${local.environment_identifier}-task-grant"
  key_id            = aws_kms_key.kmsKey.id
  grantee_principal = aws_iam_role.ecs_task_role.arn
  operations        = ["Encrypt", "Decrypt", "GenerateDataKey"]
}

resource "aws_kms_grant" "taskExeRoleGrant" {
  name              = "${local.environment_identifier}-task-exe-grant"
  key_id            = aws_kms_key.kmsKey.id
  grantee_principal = aws_iam_role.ecsTaskExecutionRole.arn
  operations        = ["Encrypt", "Decrypt", "GenerateDataKey"]
}

# Create task definition
resource "aws_ecs_task_definition" "definition" {
  family                   = "${var.TARGET_ENV_PROVIDER_NAME}-${var.APP_NAME}-task"
  task_role_arn            = aws_iam_role.ecs_task_role.arn
  execution_role_arn       = aws_iam_role.ecsTaskExecutionRole.arn
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  requires_compatibilities = ["FARGATE"]
  container_definitions = jsonencode(
  [
    {
      "name": "${var.APP_NAME}-${var.TARGET_ENV_PROVIDER_NAME}-container",
      "image": "${aws_ecr_repository.ecrRepository.repository_url}",
      "cpu": 0,
      "essential": true,
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-create-group": "true",
          "awslogs-group": "${aws_cloudwatch_log_group.taskLogGroup.name}",
          "awslogs-region": "${var.REGION}",
          "awslogs-stream-prefix": "${var.APP_NAME}"
        }
      },
      "portMappings": [
        {
          "containerPort": 8080,
          "hostPort": 8080
          "protocol": "tcp"
        }
      ],
    } 
  ])
  } 

# resolve the existing provider VPC and subnets
data "aws_vpc" "selected" {
  id = var.TARGET_VPCID
}

data "aws_subnets" "all_subnet" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.selected.id]
  }
}

data "aws_subnets" "public_subnets" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.selected.id]
  }
  tags = {
        "aws-cdk:subnet-type" = "Public"
  }
}

data "aws_subnets" "private_subnets" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.selected.id]
  }
  tags = {
        "aws-cdk:subnet-type" = "Private"
  }
}


data "aws_subnet" "subnet" {
  for_each = toset(data.aws_subnets.public_subnets.ids)
  id       = each.value
}

data "aws_subnet" "privateSubnet" {
  for_each = toset(data.aws_subnets.private_subnets.ids)
  id       = each.value
}

data "aws_ecs_task_definition" "main" {
  task_definition = aws_ecs_task_definition.definition.family
}

# Security group for LB to allow access to the container from anywhere
resource "aws_security_group" "load_balancer_security_group" {
  vpc_id = data.aws_vpc.selected.id
  ingress {
    from_port        = 80
    to_port          = 80
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }
  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }
}

# Security group for the ECS Service
resource "aws_security_group" "service_security_group" {
  vpc_id = data.aws_vpc.selected.id
  ingress {
    from_port       = 0
    to_port         = 0
    protocol        = "-1"
    security_groups = [aws_security_group.load_balancer_security_group.id]
  }
  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }
}

# create a target group for our task
resource "aws_lb_target_group" "target_group" {
  name        = "${var.APP_NAME}-${var.TARGET_ENV_PROVIDER_NAME}-tg"
  port        = 80
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = data.aws_vpc.selected.id

  health_check {
    healthy_threshold   = "3"
    interval            = "300"
    protocol            = "HTTP"
    matcher             = "200"
    timeout             = "3"
    path                = "/"
    unhealthy_threshold = "2"
  }
}

# output "subnet-outputs" {
#   value = [for subnet in data.aws_subnet.subnet : subnet.id]
# }

# create a load balancer to expose our task
resource "aws_alb" "application_load_balancer" {
  name               = "${var.APP_NAME}-${var.TARGET_ENV_PROVIDER_NAME}-alb"
  internal           = false
  load_balancer_type = "application"
  subnets            = [for subnet in data.aws_subnet.subnet : subnet.id]
  security_groups    = [aws_security_group.load_balancer_security_group.id]
}

resource "aws_lb_listener" "listener" {
  load_balancer_arn = aws_alb.application_load_balancer.id
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.target_group.id
  }
}

# now create an ECS Service with our task definition and security groups
resource "aws_ecs_service" "aws-ecs-service" {
  name                 = "${var.APP_NAME}-${var.TARGET_ENV_PROVIDER_NAME}-ecs-service"
  cluster              = "${var.TARGET_ECS_CLUSTER_ARN}"
  task_definition      = "${aws_ecs_task_definition.definition.arn}"
  launch_type          = "FARGATE"
  desired_count        = 0

  network_configuration {
    subnets          = [for subnet in data.aws_subnet.privateSubnet : subnet.id]
    assign_public_ip = false
    security_groups = [
      aws_security_group.service_security_group.id,
      aws_security_group.load_balancer_security_group.id
    ]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.target_group.arn
    container_name   = "${var.APP_NAME}-${var.TARGET_ENV_PROVIDER_NAME}-container"
    container_port   = 8080
  }

  depends_on = [aws_lb_listener.listener]
}


data "aws_caller_identity" "current" {}

resource "random_uuid" "uuid" {}

# Create outputs

output "EcrRepositoryUri" {
 value       = aws_ecr_repository.ecrRepository.repository_url
 description = "The ECR repository Uri"
}

output "EcrRepositoryArn" {
 value       = aws_ecr_repository.ecrRepository.arn
 description = "The ECR repository Arn"
}

output "EcsServiceArn" {
 value       = aws_ecs_service.aws-ecs-service.id
 description = "The ECS service Arn"
}

output "EcsTaskDefinitionArn" {
 value       = aws_ecs_task_definition.definition.arn
 description = "The ECS task definition Arn"
}

output "AlbEndpoint" {
 value       = "http://${aws_alb.application_load_balancer.dns_name}"
 description = "The endpoint for the ALB where the service can be reached"
}

output "TaskLogGroup" {
 value       = aws_cloudwatch_log_group.taskLogGroup.name
 description = "The LogGroup stream prefix"
}

output "AppResourceGroup" {
 value       = aws_resourcegroups_group.taskResourceGroup.id
 description = "The tag-based resource group to identify resources"
}

output "TaskExecutionRoleArn" {
 value       = aws_iam_role.ecsTaskExecutionRole.arn
 description = "The task execution role identify resources "
}
