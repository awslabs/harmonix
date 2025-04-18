<!-- 
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 
-->

# Harmonix on AWS Scaffolder Actions Plugin

## Overview

The Harmonix Scaffolder Actions plugin extends Backstage's scaffolder with custom actions specifically designed for AWS resource creation and management. This plugin enables software templates to provision and configure AWS resources and interact with AWSEnvironment and AWSEnvironmentProvider configurations as part of the scaffolding process.

## Installation

```sh
# From your Backstage root directory
yarn add --cwd packages/backend @aws/plugin-scaffolder-backend-aws-apps-for-backstage@0.4.0
```

## Configuration / Backend Integration

Register the scaffolder extension module in your Backstage backend:

```diff
// packages/backend/src/index.ts

const backend = createBackend();
[...]
+backend.add(import('@aws/plugin-scaffolder-backend-aws-apps-for-backstage'));
[...]

backend.start();
```

## Available Actions

After installation, you can use several custom actions in your software templates.  
For complete documentation of all available actions, install this plugin and visit the `/create/actions` 
endpoint for your Backstage instance (e.g. http://localhost:3000/create/actions).  

You can filter by "harmonix" to see all actions contributed by Harmonix with usage examples.
