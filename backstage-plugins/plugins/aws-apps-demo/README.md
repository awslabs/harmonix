<!-- 
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 
-->
# AWS Apps Demo

AWS Apps Demo is a plugin to demonstrate branding options for a Backstage implementation.
It provides a basic Home page with an ability to add customer-specific logo images via
`logo` and `logoIcon` configuration values.

![AWS Apps Demo Home page][homepageImage]

## Install

```bash
# From your Backstage root directory
yarn add --cwd packages/app @aws/plugin-aws-apps-demo-for-backstage@^0.1.0
```

## Setup

1. Configure `app-config.yaml`. See [Configuration](#configuration).  

2. Add the customer theme and sample home page route to the Backstage application.  When adding the "&lt;Route ...&gt;", ensure that the "/" root path doesn't conflict with existing routes.  If an existing route entry already uses "/", then update the route values across all routes to guarantee uniqueness.
**Note**: Adding a custom theme will override the default themes.  If this is the first theme that you are adding to your Backstage configuration, there may be additional modifications required.  See https://backstage.io/docs/getting-started/app-custom-theme/#creating-a-custom-theme for more details on additional changes to preserve existing `lightTheme` and `darkTheme` values

```diff
// packages/app/src/App.tsx
+ import { AWSAppsHomePage, customerTheme } from '@aws/plugin-aws-apps-demo-for-backstage';
+ import { darkTheme, lightTheme } from '@backstage/theme';

  
  const app = createApp({
    ...
    themes: [
+     {
+       id: 'customerTheme',
+       title: 'CUSTOMER',
+       variant: 'light',
+       Provider: ({ children }) => (
+         <ThemeProvider theme={customerTheme}>
+           <CssBaseline>{children}</CssBaseline>
+         </ThemeProvider>
+       ),
+     },
+     // add the default 'light' and 'dark' themes if you wish to continue using them
+     {
+       id: 'light',
+       title: 'Light',
+       variant: 'light',
+       Provider: ({ children }) => (
+         <ThemeProvider theme={lightTheme}>
+           <CssBaseline>{children}</CssBaseline>
+         </ThemeProvider>
+       ),
+     },
+     {
+       id: 'dark',
+       title: 'Dark',
+       variant: 'dark',
+       Provider: ({ children }) => (
+         <ThemeProvider theme={darkTheme}>
+           <CssBaseline>{children}</CssBaseline>
+         </ThemeProvider>
+       ),
+     },
    ...
    ]
  })
  
  const routes = (
    <FlatRoutes>
-     <Route path="/" element={<Navigate to="catalog" />} />
+     <Route path="/" element={<Navigate to="home" />} />
+     <Route path="/home" element={ <AWSAppsHomePage /> } />
      ...
    </FlatRoutes>
  );
```

1. Add custom logos and home page link to the Sidebar

```diff
// packages/app/src/components/Root.tsx

+ import { useApi } from '@backstage/core-plugin-api';
+ import { AWSLogoFull, AWSLogoIcon, CustomerLogoIcon, CustomerLogoFullLight } from '@aws/plugin-aws-apps-demo-for-backstage';

...

+ function getLogo(themeId: string) {
+   switch (themeId) {
+     case 'customerTheme':
+       return[<CustomerLogoFullLight />, <CustomerLogoIcon />];
+     default:
+       return [<LogoFull />, <LogoIcon />];
+   }
+ }

  const SidebarLogo = () => {
+   const appThemeApi = useApi(appThemeApiRef);
+   const themeId = appThemeApi.getActiveThemeId();
    const classes = useSidebarLogoStyles();
    const { isOpen } = useSidebarOpenState();

+  const [fullLogo, iconLogo] = getLogo(themeId ?? '');

    return (
      <div className={classes.root}>
        <Link to="/" underline="none" className={classes.link} aria-label="Home">
+         {isOpen ? fullLogo : iconLogo}
        </Link>
      </div>
    );
 };

  export const Root = ({ children }: PropsWithChildren<{}>) => (
    <SidebarPage>
      <Sidebar>
        ...
        <SidebarGroup label="Menu" icon={<MenuIcon />}>
+         <SidebarItem icon={HomeIcon} to="/" text="Home" />
          ...
        </SidebarGroup>
      </Sidebar>
    </SidebarPage>
  )

```

## Configuration

AWS Apps Demo has two configuration fields.  Each of these fields are optional.  If they are not specified, then default values will be used.

- `logo` - a URL pointing to an image file to be used on the home page and in the SideBar when it is expanded.  The default value will point to an Amazon logo.
- `logoIcon` - a URL pointing to an image file to be used in the SideBar when it is collapsed.  When the sidebar is collapsed, there is limited space, so this image should be a small image which is roughly square in shape.  The default value will point to a small Amazon logo.

Note that you may also need to configure the **backend.csp.img-src** value to allow for loading images from a remote site.

Example configuration:

```yaml
// app-config.yaml

app:
  title: Backstage App Suite
  baseUrl: "http://localhost:3000"
  logo: "https://mycompany.com/images/companyLogo.png"
  logoIcon: "https://mycompany.com/images/companyLogo_small.png"

backend:
  csp:
    connect-src: ["'self'", 'http:', 'https:']
    img-src: ["'self'", 'https://mycompany.com']
```

## Next Steps

The home page provided in this plugin is a simple demonstration page.  You can modify the `AWSAppsHomePage.tsx` content to meet your needs.  See the Backstage documentation for home page setup and customization for more details on how you can customize your experience: https://backstage.io/docs/getting-started/homepage

<!-- link definitions -->
[homepageImage]: docs/images/homePage.png 'AWS Apps Demo Home page'