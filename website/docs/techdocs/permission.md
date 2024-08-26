---
sidebar_position: 6
title: Permissions

---

# Authorization and Permissions

The [Security Authentication section](/docs/techdocs/security#authentication) captures mechanisms used to authenticate and store users and organizational data.  At sign-in, it is possible to restrict access to Harmonix on AWS through configuration of identity provider integration to provide authorization at the "front door" of the application.  It is also possible to provide a more granular mechanism to enforce authorization of access to APIs, UI components, and data by utilizing the [Backstage permission framework](https://backstage.io/docs/permissions/overview).

The sections below document examples of how you can specify a policy and restrict access to specific types of actions and entities through group membership.

## Specifying a policy

The Harmonix on AWS plugins for Backstage provide example permission policies to demonstrate how the permission framework can be leveraged to enforce access controls to specific template types and Harmonix APIs.  In the reference implementation, the policy used by the permission framework is found in the `backstage/packages/backend/src/plugins/permission.ts` file.  By default, an "allow all" sample policy is used.  In the example below, the policy configuration is modified to specify an alternative sample policy named `OpaSamplePermissionPolicy`.

```diff {4-5,13-14} title="backstage/packages/backend/src/plugins/permission.ts"
  import { createRouter } from '@backstage/plugin-permission-backend';
  import { Router } from 'express';
  import { PluginEnvironment } from '../types';
- import { OpaSampleAllowAllPolicy } from './OpaSamplePermissionPolicy';
+ import { OpaSamplePermissionPolicy } from './OpaSamplePermissionPolicy';


  export default async function createPlugin(env: PluginEnvironment): Promise<Router> {
    return await createRouter({
      config: env.config,
      logger: env.logger,
      discovery: env.discovery,
-     policy: new OpaSampleAllowAllPolicy(),
+     policy: new OpaSamplePermissionPolicy(),
      identity: env.identity,
    });
  }
```

## Defining Groups

The sample `OpaSamplePermissionPolicy` policy example assumes that groups named 'admins', 'dev-ops', and 'developers' are created by the provider which populates the catalog with organizational data.  The defined organizational groups are used in policy decisions defined in the permission policy function. The sample code for groups can be modified as needed to customize the group names.


```ts title="backstage/packages/backend/src/plugins/OpaSamplePermissionPolicy.ts"
// The Group entity ref constants below are based on group identifiers created from the auth IdP or manually created
// Update the entity ref identifiers as appropriate to match your Backstage installation
const ADMINS_GROUP = stringifyEntityRef({ 
    kind: 'Group', 
    namespace: DEFAULT_NAMESPACE, 
    name: "admins" 
    });
const DEVOPS_GROUP = stringifyEntityRef({ 
    kind: 'Group', 
    namespace: DEFAULT_NAMESPACE, 
    name: "dev-ops" 
    });
const DEVELOPERS_GROUP = stringifyEntityRef({ 
    kind: 'Group', 
    namespace: DEFAULT_NAMESPACE, 
    name: "developers" 
    });
```

With the groups defined, we can now review and modify the policy decision code to return authorization results to Backstage plugins.

## Restricting access to Harmonix audit logs

Harmonix on AWS provides an example permission to control access to OPA application audit logs using the `readOpaAppAuditPermission` permission definition (defined in the `@aws/plugin-aws-apps-common-for-backstage` plugin).  The code below is part of the `OpaSamplePermissionPolicy.ts` permission policy.  

Additional permissions for Harmonix on AWS APIs may be provided in the future.  If there is a specific permission required,  [open an issue](https://github.com/awslabs/app-development-for-backstage-io-on-aws/issues) or [submit a pull request](https://github.com/awslabs/app-development-for-backstage-io-on-aws/pulls) for support.

```ts title="backstage/packages/backend/src/plugins/OpaSamplePermissionPolicy.ts"
...
// store the array of entityRefs which allow this user to claim ownership of an entity
const ownershipGroups = user?.identity.ownershipEntityRefs || [];

// Example permission decision:
//   ALLOW admin and devops group members to perform any action
const allowAllGroups = [ADMINS_GROUP, DEVOPS_GROUP];
if (ownershipGroups.some(x => allowAllGroups.includes(x))) {
    return { result: AuthorizeResult.ALLOW };
}

// Example permission decision: 
//   DENY audit read access unless the user is a member of Admin or DevOps
//   The implementation below assumes that prior checks have returned an
//   'allow' policy decision for groups other than 'developer'
if (isPermission(request.permission, readOpaAppAuditPermission) && ownershipGroups.includes(DEVELOPERS_GROUP)) {
    return { result: AuthorizeResult.DENY };
}
...
```

## Restricting access to templates

A common use case may be to restrict access to AWS Environment and Environment Provider template to only members of a specific group.  For example, you may want Platform Engineers to use these templates, but prevent Application Developers and other groups from creating new AWS infrastructure.

The code snippet below is part of the `OpaSamplePermissionPolicy.ts` permission policy and shows how a conditional decision can be returned for templates of type `aws-environment` or `aws-environment-provider`.  Unless the user is an owner of the template, they will not be allowed to view or execute these software template types ("ownership" is either through direct user ownership or a member of the group that owns the template).

```ts title="backstage/packages/backend/src/plugins/OpaSamplePermissionPolicy.ts"
...
// Example permission decision:
//   Multiple groups of permission decisions can be nested under the first check to ensure we're working with catalog entities
if (isResourcePermission(request.permission, RESOURCE_TYPE_CATALOG_ENTITY)) {

  // Example permission decision:
  //   DENY users access to software templates of type 'aws-environment' or
  //   'aws-environment-provider' if they cannot claim ownership of the entity
  if (isPermission(request.permission, catalogEntityReadPermission)) {
    return createCatalogConditionalDecision(request.permission, {
      not: {
        allOf: [
          catalogConditions.isEntityKind({ kinds: ['template'] }),
          {
            anyOf: [
              catalogConditions.hasSpec({ key: 'type', value: 'aws-environment' }),
              catalogConditions.hasSpec({ key: 'type', value: 'aws-environment-provider' }),
            ],
          },
        ],
      },
    });
  }
}
...
```

