PREFIX                = "${{ values.prefix }}"
ENV_NAME              = "${{ values.name }}"
AWS_ACCOUNT_ID        = "${{ values.awsAccount }}"
AWS_DEFAULT_REGION    = "${{ values.awsRegion }}"
PLATFORM_ROLE_ARN     = "${{ values.platformRole }}"
PIPELINE_ROLE_ARN     = "${{ values.pipelineRole }}"
PROVISIONING_ROLE_ARN = "${{ values.environmentRole }}"
{%- if values.vpcid %}
VPC_ID                = "${{ values.vpcid }}"
{%- endif %}
{%- if values.cidr %}
ENV_CIDR              = "${{ values.cidr }}"
{%- endif %}
