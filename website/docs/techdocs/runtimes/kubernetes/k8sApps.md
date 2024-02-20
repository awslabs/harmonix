---
sidebar_position: 3
---

# Kubernetes Applications

OPA on AWS comes out of the box with several application templates that can be utilized by developers to easily create kubernetes applications that get deployed to OPA Environments. These templates demonstrate the use of application tech stacks including Java/SpringBoot, NodeJS, and Python.

Once an application is created, developers can view valuable information about its state across all deployed environments and even perform application operations using the OPA UI.

#### Screenshot of Viewing Application Logs:
<p align="center">
![k8s_app_logs_ui.png](/img/opa/apps/k8s_app_logs_ui.png)
</p>

#### Screenshot of Viewing Application Deployments:
<p align="center">
![k8s_app_state_ui.png](/img/opa/apps/k8s_app_state_ui.png)
</p>

## Components of an OPA Kubernetes Application

No matter which application template a developer chooses, a Git repository will be created for their application that contains the following:

  * Backstage entity YAML file
    * This is automatically read by OPA so that your applications show up in the portal
  * Application source code
  * Kubernetes manifests (utilizing Helm or Kustomize for multi-environment deployment support)
  * A CICD pipeline that will build your application's container image and deploy it to each of your application's configured environments
  * Infrastructure as Code (IaC) scripts that provision application-specific infrastructure

## FAQ

  * **Q**: How Does OPA CICD support deploying my application using Helm or Kustomize?
  * **A**: The CICD pipeline detects whether the application is set up using Helm or Kustomize. It then resolves these configurations for each environment to create pure kubernetes manifests. The deployment step uses the pure kubernetes manifests, not the Helm or Kustomize configurations. The generated manifests are stored in the Git repository by OPA. The manifests are stored in JSON and YAML format. The file names are next-release.json and next-release.yaml, respectively.

  * **Q**: How Does OPA CICD handle deploying my kubernetes application to more than one environment?
  * **A**: For each environment your application is deployed to, OPA will create a separate folder for environment-specific kubernetes manifest customizations. If your application is configured with Helm, the separate folder only contains a values.yaml file that has settings for the environment. If your application is configured with Kustomize, the separate folder will contain overlay files that customize your base manifests.

  * **Q**: How Does OPA UI Get The State of My Application's Deployments?
  * **A**: OPA will query the cluster. The query will limit results to the kubernetes namespace that the application uses in a particular deployment environment. The query will also limit results to Deployments that have a "app.kubernetes.io/name" label set to the application's name and a "app.kubernetes.io/env" label set to the environment that the application is running in.

