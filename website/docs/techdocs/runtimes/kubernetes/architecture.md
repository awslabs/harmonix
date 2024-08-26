---
sidebar_position: 2
---

# Harmonix EKS Architecture

To understand how Harmonix [Environments](/docs/techdocs/entities#aws-environment) and [Environment Providers](/docs/techdocs/entities#aws-environment-provider) relate to applications and clusters, take a look at the below diagram.

<p align="center">
![opa_eks_architecture.png](/img/opa/providers/opa_eks_architecture.png)
</p>

This example diagram is meant to show that Harmonix can work across AWS accounts and regions. Harmonix allows you to create as many clusters as you want, but also to share the clusters between applications and application environments. The above configuration is just one way that you could set up your apps and clusters. Harmonix gives you full flexibility on how many accounts, regions, clusters, and environments you want to use as well as which ones are used by which applications. The choice is yours on how many environments you create as well as their scope of use. For example, you can choose to create an Environment for each application or each team, or even for groups of applications. For a more in-depth explanation of Harmonix environments, see our [Harmonix environments video on YouTube ](https://www.youtube.com/watch?v=EgfIAPzIAHk&list=PLhr1KZpdzukcf5e7vYOVkpw4h-rzy7Pn3&index=4).

In the example above, we see an application, "App 1", that is deployed to 4 distinct Environments. The DEV and TEST Environments are for "non-production" use, and run in a non-prod AWS account. The STAGE and PROD Enviroments run on a production AWS account.

The non-prod Environments point to the same Environment Provider, which means that both of these Environments share the same cluster. Developers can make use of kubernetes [namespaces](https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/) to separate application resources (within the same cluster) as they see fit. For example, they could choose to create a namespace per application, a namespace per application environment, or even a namespace per team or department.

The STAGE and PROD environments above each use their own separate cluster, which can be on the same AWS account or a different account.
