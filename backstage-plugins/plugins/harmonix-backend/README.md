<!-- 
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 
-->
# Harmonix Backend Plugin

## Overview

The Harmonix Backend plugin is a core component of the Harmonix on AWS solution, providing essential backend services that enable Harmonix functionality within your Backstage instance. This plugin serves as a bridge between your Backstage application and various external services.

## Key Capabilities

The plugin provides backend methods to interact with:

* **AWS SDK Backend** - Calls AWS SDK APIs to manage and interact with AWS resources
* **Git Provider Backend** - Interfaces with git providers to query and manage repositories
* **Platform Backend** - Integrates with Backstage platform backend APIs

## Installation

```sh
# From your Backstage root directory
yarn add --cwd packages/backend @aws/plugin-aws-apps-backend-for-backstage@0.4.0
```

## Configuration

### Backend Integration

Configure your Backstage backend in `packages/backend/src/index.ts` to integrate with the Harmonix backend plugin:

```diff
// packages/backend/src/index.ts
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();
...

+backend.add(import('@aws/plugin-aws-apps-backend-for-backstage'));

backend.start();
}
```

> **Note:** If you installed the complete Harmonix platform suite, this configuration is automatically applied through git patches.

## Dependencies

This plugin depends on the following Harmonix components:

* `@aws/plugin-aws-apps-common-for-backstage` - Shared utilities and types

Ensure these dependencies are properly installed and configured in your Backstage instance.

