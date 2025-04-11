<img src="./docs/images/harmonix-blue.png"
     alt="Harmonix on AWS"
     style="margin-right: 10px;max-height: 400px; " />

:star: **Harmonix on AWS v0.3.4 now available!** :star:
* Upgraded Harmonix on AWS to the latest Backstage version and new backend system. 1.29.0
* New custom entity processor plugin - compatible with the new backend backstage system. details here
* Updated Gitlab version 17.2.2
* Support for Github and Multi-Git provider
* New template examples - including Terraform ECS cluster
* New SecretsManager shared resource template
* New entity Schema updates - gitProvider, componentState, component spec subType details here
* General package version updates
* Bug fixes


:star: **Harmonix on AWS v0.3.3** :star:
* S3 Bucket as a shared resource
* Reuse existing VPC when creating providers
* Amazon ECS provider with EC2 clusters for tailored workloads
* Amazon EKS provider
* Import existing Amazon EKS clusters
* Amazon EKS Application for K8s Kustomize pattern
* Amazon EKS Application for K8s Helm pattern
* CI/CD patterns for K8s applications
* Updated Backstage platform to v1.21
* Filter relevant environments for new apps

Refer to the [CHANGELOG](https://harmonixonaws.io/docs/CHANGELOG) for a complete list of new features and capabilities.
# Harmonix on AWS (Previously known as OPA on AWS)

Harmonix Provides a new developer experience to simplify the use and consumption of AWS services while minimizing required expertise in cloud infrastructure technologies.  
Built on the [Backstage open platform](https://backstage.io), this solution makes the AWS cloud more accessible to application developers allowing them to focus on building application logic and delivering business value.

This solution leverages the flexibility and extensibility of the Backstage platform to provide customizable software templates, scaffolder actions, and deployment patterns. While this provides a lot of freedom in implementation, it can be overwhelming to get started.  To help users get started, a reference repository is also provided with samples to show how to use the solution.

:clapper: **Demonstrations and Tutorials**

[Harmonix on AWS Website](https://harmonixonaws.io) <br/>
[Harmonix on AWS Documentation](https://harmonixonaws.io/docs/intro) <br/>
[Tutorial YouTube videos](https://harmonixonaws.io/docs/getting-started/videos)

## Getting Started
Please see our [Getting started documentation](https://harmonixonaws.io/docs/getting-started/deploy-the-platform)

## 1. Architecture Overview
See our [high level architecture](https://harmonixonaws.io/docs/techdocs/architecture)
For details on the solution architecture lower level design. ->  [ARCHITECTURE.md](./docs/ARCHITECTURE.md)   

## 2. Installation
Please see our [Installation instructions](https://harmonixonaws.io/docs/getting-started/deploy-the-platform)

## 3. FAQs
Please see our [FAQs page](https://harmonixonaws.io/docs/faq)

## 4. Build locally

```sh
cd backstage-plugins
yarn --cwd plugins tsc --outDir dist-types
yarn --cwd plugins build
```

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This project is licensed under the Apache-2.0 License.
