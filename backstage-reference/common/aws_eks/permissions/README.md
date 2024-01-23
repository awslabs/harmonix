Add AWS IAM policy statements here, each file with a particular statement that grants the pod access.

Make sure the tasks are of the format - statement-xxx.json

example:
{
    "Effect": "Allow",
    "Action": ["rds:*"],
    "Resource": "*"
}
