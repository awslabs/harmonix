# What is this module for?
This module creates following resources:
* DynamoDB table
* KMS encryption key for data encryption
* Optional DynamoDB stream
* Optional attributes (required if using secondary indices)
* Optional global secondary indices
* Optional local secondary indices


# How do I use it?
Simple useage:

```hcl
module "example_3" {
  source         = "../../modules/dynamodb"
  table_name     = "Example-3"
  hash_key       = "Id"
  range_key      = "Timestamp"
  stream_enabled = true

  attributes = [
    {
      name = "NewAttribute",
      type = "S"
    }
  ]

  local_secondary_indices = [
    {
      name = "Index-Name",
      range_key = "NewAttribute"
    }
  ]

  global_secondary_indices = [
    {
      name = "Index-Name",
      hash_key = "NewAttribute",
      range_key = "Timestamp"
    }
  ]
}
```

**NOTE:** Both hash_key and range_key are assumed to be string types. New attributes used by secondary indices need to added manually (see ***NewAttribute*** above).

# Inputs
|Variable name|Required|Description|
|-------------|--------|-----------|
|table_name|Yes|Name of the table to create|
|hash_key|Yes|Hash key for the table|
|range_key|No|Optional sort key of the table|
|stream_enabled|No|Optional flag indicating if the dynbamo db stream is to be enabled on the table. Defaults to false|
|attributes|No|Additional attributes to create. Is required when using new attributes in secondary indices that are not the ***hash_key*** or ***sort_key***. Supports string ("S"), number ("N") and boolean ("B") types|
|local_secondary_indices|No|Optional local secondary indices. Must be defined as a list of objects with each object having a name and range_key attribute.|
|global_secondary_indices|No|Optional global secondary indices. Must be defined as a list of objects with each object having a name, hash_key, and range_key attribute.|

# Outputs
|Output|Description|
|---|---|
|arn|ARN of the table|
|stream_arn|ARN of the dynamodb stream created|

# Ignored checkov warnings

|Warning|Description|Reason|
|---|---|---|

