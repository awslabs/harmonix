# [Backstage](https://backstage.io)

Notes about customization/configuration of the backstage application
## Local PostgreSQL database usage

For local development and testing with a PostgreSQL database as the backend datastore,
secrets and other env vars will be stored in a `.env.yaml` file.  This file will be
used by Docker Compose and the Backstage app to read configured environment variables.
The `.env.yaml` file will be automatically populated with the latest values from
SecretsManager by running `make build` from the project root.

You can then run a local Postgres database container and local backstage app with:

```sh
make start-local
```

Once the containers have been started, you can query the database directly through the adminer
container.  This container is also started by the `make start-local` command).  Open a browser to
http://localhost:8080.  Log into the database through the Adminer interface with the following
values:

- **System**: PostgreSQL
- **Server**: db
- **Username**: *value specified for the POSTGRES_USER environment variable in the `.env.yaml` file - default is `postgres`*
- **Password**: *value specified for the POSTGRES_PASSWORD environment variable in the `.env.yaml` file*
- **Database**: postgres

## Authentication with Okta

This section captures the install, configuration, and gotchas related to setting up Okta as an identity provider for Backstage.  Much of the implementation is "out-of-the-box" using providers and plugins from Backstage -- just requires a bit of configuration and small amount of code.

A pre-req for this setup is that an Okta account must be created with Group(s) and User(s) defined in the account.  This documentation was created by using a [developer Okta account](https://developer.okta.com/signup/).  An Okta account via the AWS Marketplace should provide the same results (with fewer restrictions).

Once you've created an Okta account with groups/users, you will need to create an Okta application (named 'backstage') as described in the "Create an Application on Okta" section at <https://backstage.io/docs/auth/okta/provider>.


**User Experience**: The user experience after implementing the steps described below will ensure that a user is presented with a "login" page in Backstage if they are not already logged in.  The login page simply provides a 'Sign In' button which will delegate login via a popup window for the user to enter Okta credentials.  Okta with authenticate the provided credentials and pass back to Backstage where the User will be looked up in the Backstage catalog.  If the user is successfully found in the catalog, they will be redirected to the Home page.  
:warning: **Note** - The Okta authentication simply acts as a gatekeeper to allow access to Backstage.  There is currently no authorization/permissions in place.  The default policy for Okta JWT tokens is 60 minutes for the ID and access tokens and 100 days for the refresh token.  The user will not be prompted to log back in unless a new policy with shorter token durations is created.  

### Backstage configuration for an Okta auth provider

Configuration of the Okta auth provider requires specification of the provider in the app-config.yaml file and also updating the Backstage application UI to prompt for signin.

Edit your `app-config.local.yaml` file to add the following auth configuration.  Provide the values in `<angle brackets>` from your Okta application configuration

```yaml
auth:
  # see https://backstage.io/docs/auth/ to learn about auth providers
  environment: development
  providers:
    okta:
      development:
        clientId: '<OKTA_APP_CLIENT_ID>'
        clientSecret: '<OKTA_APP_CLIENT_SECRET>'
        audience: 'https://<OKTA_DOMAIN>.okta.com/'
        # authServerId: 
        # idp: 
```

The Backstage UI will also need to be updated to show the user a "Login with Okta" prompt.  The implementation used below also allows for a 'guest' login in case you need to get into the app to inspect the catalog and UI behavior.
Open the `backstage/packages/app/src/App.tsx` file and make the following changes (in bold):

<pre>
...

import { AlertDisplay, OAuthRequestDialog, <b>SignInPage</b> } from '@backstage/core-components';

...
const app = createApp({
  apis,
  <b>components: {
    SignInPage: props => {
      return (
        &lt;SignInPage
        {...props}
        auto
        providers={['guest', {
          id: 'okta-auth-provider',
          title: 'Okta',
          message: 'Sign in using Okta',
          apiRef: oktaAuthApiRef
        }]}
        /&gt;
      );
    }
  },
  </b>
  bindRoutes({ bind }) {
...
</pre>

### Okta sign-in identity and resolver

The configuration above simply adds a sign-in authentication.  We still need to ensure that the signed-in user has a matching  [User Component entity](https://backstage.io/docs/features/software-catalog/descriptor-format#kind-user) that it can map to in the Backstage catalog.

A [plugin](https://github.com/RoadieHQ/roadie-backstage-plugins/tree/main/plugins/backend/catalog-backend-module-okta) developed by RoadieHQ can provide the basic functionality to populate the Backstage catalog with the groups and users from Okta.  This is done via a provider that is run at startup.

To install and configure the backend plugin for the catalog, perform the following steps:

**1. Install**
Install the plugin into the backend workspace:
   `yarn workspace backend add @roadiehq/catalog-backend-module-okta`

**2. Auth Resolver**
Update the backend auth to declare a resolver async function for signin.  Edit `backstage/packages/backend/src/plugins/auth.ts` to remove the default github provider factory and replace it with an okta provider configuration:
  <pre>
  ...
  providerFactories: {
    ...defaultAuthProviderFactories,
    <strike>github: providers.github.create({
      signIn: {
        resolver(_, ctx) {
          const userRef = 'user:default/guest'; // Must be a full entity reference
          return ctx.issueToken({
            claims: {
              sub: userRef, // The user's own identity
              ent: [userRef], // A list of identities that the user claims ownership through
            },
          });
        },
      },
    }),</strike>
    <b>okta: providers.okta.create({
      signIn: {
        resolver: async (info, ctx) => {
          const {
            profile: { email },
          } = info;
          if (!email) {
            throw new Error('User profile contained no email');
          }
          const [name] = email.split('@');
          return ctx.signInWithCatalogUser({
            entityRef: { name }
          });
        }
      },
    }),</b>
    ...
  }
  </pre>

:pencil: **Note**: The backend catalog definition for entity metadata `name` values does not allow **+** symbols.  This introduces a restriction that email addresses associated with a user's profile cannot use a subaddressing scheme (i.e. _user+qualifier@domain.com_).  We could write our own entity id resolver and backend plugin which would convert the plus symbol to a hyphen or underscore.  This seems to be unwarranted for a prototype, but would not be terribly difficult to implement if testing with "dummy" ids requires the use of subaddressing.

:question: _What happens if a user is added to or modified in Okta after the Backstage backend has been started?  Should Okta event triggers be configured to invoke a webhook endpoint?  Use cron job-like polling to perform a regular refresh?  Can we ignore this for a prototype?_

**3. Specify Catalog Provider code**

Update the catalog plugin to use the OktaOrgEntityProvider available from the RoadieHQ plugin that we installed.  Edit the `backstage/packages/backend/src/catalog.ts` file as follows (new code in **bold**):

<pre>
import { CatalogBuilder } from '@backstage/plugin-catalog-backend';
import { ScaffolderEntitiesProcessor } from '@backstage/plugin-scaffolder-backend';
import { Router } from 'express';
import { PluginEnvironment } from '../types';
<b>import { OktaOrgEntityProvider } from '@roadiehq/catalog-backend-module-okta';</b>

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  const builder = await CatalogBuilder.create(env);
<b>  
  const orgProvider = OktaOrgEntityProvider.fromConfig(env.config, {
    logger: env.logger,
    userNamingStrategy: 'strip-domain-email',  // 'strip-domain-email' | 'kebab-case-email' | 'id'
    groupNamingStrategy: 'kebab-case-name',  // 'kebab-case-name' 
  });

  builder.addEntityProvider(orgProvider);
</b>
  builder.addProcessor(new ScaffolderEntitiesProcessor());
  const { processingEngine, router } = await builder.build();
<b>
  orgProvider.run();
</b>
  await processingEngine.start();

  return router;
}
</pre>

**4. Add a catalog provider config to catalog**
With the code in place, we now need to specify the new provider in the Backstage application configuration.  You will first need to create [an Okta API Token](https://developer.okta.com/docs/guides/create-an-api-token/main/).  Save the token value to add it into the yaml configuration below.

Edit your `app-config.local.yaml` file to add the catalog provider configuration:

```yaml
catalog:
  providers:
    okta:
      - orgUrl: 'https://dev-xxxxxxxx.okta.com'
        token: '<token_value>'
          # $include: ./.env.yaml#OKTA_API_TOKEN
        # userFilter: profile.department eq "engineering"
        # groupFilter: profile.name eq "Developers"
```
