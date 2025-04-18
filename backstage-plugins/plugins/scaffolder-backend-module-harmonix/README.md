<!-- 
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 
-->

# Harmonix on AWS Scaffolder Actions

`@aws/plugin-scaffolder-backend-aws-apps-for-backstage`

This plugin provides scaffolder actions to create AWS resources and utility actions.

## Install

```sh
# From your Backstage root directory
yarn add --cwd packages/backend @aws/plugin-scaffolder-backend-aws-apps-for-backstage@0.4.0
```

## Configuration New Backend System

Register the scaffolder extension module plugin in backstage

```diff
// packages/backend/src/index.ts

const backend = createBackend();
[...]
+backend.add(import('@aws/plugin-scaffolder-backend-aws-apps-for-backstage'));
[...]

backend.start();


```
After the scaffolders configuration is updated, you can use the new actions in your Software Templates.

For documentation, first install this plugin into your backstage and then visit this page: [scaffolder actions examples](/create/actions)
i.e: http://localhost:3000/create/actions
Filter by "harmonix"

## Plugin Dependency
This backstage backend plugin depends on other Harmonix plugins - in order to compile the code properly, make sure all dependencies are installed and configured properly.
