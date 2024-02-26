Add AWS IAM policy statements here, each file with a particular statement that grants access to a managed policy which is referenced by lambda function IAM roles.
Make sure the tasks are of the format - statement-xxx.json

example:
{
    "Effect": "Allow",
    "Action": ["rds:*"],
    "Resource": "*"
}
