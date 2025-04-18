<!-- 
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 
-->
# Harmonix on AWS Backend

This is the backend plugin of the Harmonix on AWS solution.  Its key responsibilities include providing backend methods to interact with external services such as:

* AWS SDK Backend - Calling AWS SDK APIs
* Git Provider Backend  - Calling git provider backend APIs
* Platform Backend - Call platform backend APIs

## Installation

```sh
# From your Backstage root directory
yarn add --cwd packages/backend @aws/plugin-aws-apps-backend-for-backstage@0.4.0
```

## New Backend Configuration

Configure your backstage backend `packages/backend/src/index.ts` to integrate with the Harmonix backend plugin as below:

** this is for manual installation, if you install the Harmonix platform as a complete suite - git patch will take care of the below configuration.

```diff
// packages/backend/src/index.ts
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();
...

+backend.add(import('@aws/plugin-aws-apps-backend-for-backstage'));

backend.start();
}
```

## Plugin Dependency
This backstage backend plugin depends on other Harmonix plugins - in order to compile the code properly, make sure all dependencies are installed and configured properly.
