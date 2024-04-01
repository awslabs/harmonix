---
sidebar_position: 7
title: Customizations

---

# Customizing and Extending OPA on AWS

## Running locally

It is possible to run the OPA UI and Backstage database locally on your workstation via a container runtime such as Docker Desktop. Running locally makes it much faster to customize OPA and see your changes running quickly. Other benefits include restarting or "bouncing" OPA/Backstage easily and clearing out the Backstage database (running on a local container) and starting fresh, without impacting others.

To run the OPA UI and Backstage database locally, use this command:

`make start-local`

This command will spin up conainer images and let you view the OPA UI via localhost (e.g. http://localhost:3000).

NOTE: You need to have run `make install` at least once successfully before the `make start-local` command can be run.

## How to modify OPA plugins

If you want to modify any OPA plugins and see the effects of your changes locally, you'll need to do the following:

  1. Update the `build-script/backstage-install.sh` file and change the value of the `installMode` variable from `npm` to `from-source`. This will make it so that building OPA UI/Backstage will use the plugin code from your local project instead of downloading official OPA plugins from NPM.
  2. After each change to plugins code, you will need rebuild the plugins and restart your locally-running Backstage instance before you can see the changes show up on your locally running Backstage. To rebuild the plugins, execute `make backstage-install`. To start or restart Backstage, execute `make start-local`

## How to add or modify software templates

If you want to modify existing OPA (app/resource/environment) templates and test them locally, do the following:

  1. Make your template changes
  2. Run this command to deploy your templates so that Backstage will use your latest version when scaffolding: `make push-backstage-reference-repo`.

You can add your own software templates as well. To do this, you need to let Backstage know about your template so that it can show it in its UI. 

Out of the box, OPA defines what templates to use in a file called `all-templates.yaml`. You can add a reference to your new template in this file.

The below code snippet shows where the `all-templates.yaml` file is referred to from Backstage configurations file at `config/app-config.aws-production.yaml`

```
catalog:

  locations:
    # AWS templates
    - type: url
      target: https://${SSM_GITLAB_HOSTNAME}/opa-admin/backstage-reference/-/blob/main/templates/all-templates.yaml
      rules:
        - allow: [Location, Template]
```
