---
sidebar_position: 12
---

## Contributing

Thank you for your interest in contributing to our project. Whether it's a bug report, new feature, correction, or additional
documentation, we greatly value feedback and contributions from our community.

Please read through this document before submitting any issues or pull requests to ensure we have all the necessary
information to effectively respond to your bug report or contribution.


### Reporting Bugs/Feature Requests

We welcome you to use the GitHub issue tracker to report bugs or suggest features.

When filing an issue, please check existing open, or recently closed, issues to make sure somebody else hasn't already
reported the issue. Please try to include as much information as you can. Details like these are incredibly useful:

* A reproducible test case or series of steps
* The version of our code being used
* Any modifications you've made relevant to the bug
* Anything unusual about your environment or deployment


### Contributing via Pull Requests
Contributions via pull requests are much appreciated. Before sending us a pull request, please ensure that:

1. You are working against the latest source on the *main* branch.
2. You check existing open, and recently merged, pull requests to make sure someone else hasn't addressed the problem already.
3. You open an issue to discuss any significant work - we would hate for your time to be wasted.

To send us a pull request, please:

1. Fork the repository.
2. Modify the source; please focus on the specific change you are contributing. If you also reformat all the code, it will be hard for us to focus on your change.
3. Ensure local tests pass.
4. Commit to your fork using clear commit messages.
5. Send us a pull request, answering any default questions in the pull request interface.
6. Pay attention to any automated CI failures reported in the pull request, and stay involved in the conversation.

GitHub provides additional document on [forking a repository](https://help.github.com/articles/fork-a-repo/) and
[creating a pull request](https://help.github.com/articles/creating-a-pull-request/).


### Finding contributions to work on
Looking at the existing issues is a great way to find something to contribute on. As our projects, by default, use the default GitHub issue labels (enhancement/bug/duplicate/help wanted/invalid/question/wontfix), looking at any 'help wanted' issues is a great place to start.


### Code of Conduct
This project has adopted the [Amazon Open Source Code of Conduct](https://aws.github.io/code-of-conduct).
For more information see the [Code of Conduct FAQ](https://aws.github.io/code-of-conduct-faq) or contact
opensource-codeofconduct@amazon.com with any additional questions or comments.


### Security issue notifications
If you discover a potential security issue in this project we ask that you notify AWS/Amazon Security via our [vulnerability reporting page](http://aws.amazon.com/security/vulnerability-reporting/). Please do **not** create a public github issue.


### Licensing

See the [LICENSE](https://github.com/awslabs/app-development-for-backstage-io-on-aws/blob/main/LICENSE) file for our project's licensing. We will ask you to confirm the licensing of your contribution.


## Contributing Assets to OPA on AWS

Thank you for considering a contribution to OPA on AWS project!
The above described guidelines are to set the standard of submitting Pull Request, That is in conjunction to the below description

### Contribution Type

1. Contributing OPA on AWS Templates
   1. Provider Template
   2. App Template
   3. Resource Template
   4. Other Template
2. Contributing OPA on AWS Pipelines
   1. New pipeline pattern
   2. Update existing pipeline pattern
3. Contributing OPA on AWS Core modifications
   1. Change in UI / Frontend of OPA on AWS plugins
   2. Change in SDK API / Backend of OPA on AWS Plugins
   3. Change in sacffolder actions
   4. Change in architecture or platform design
   5. Change in common interfaces
4. Contributing OPA on AWS extensions
   1. Integration with new tools and plugins
   2. Integration with additional Backstage.io APIs / entities
   3. Extending OPA on AWS model

### Submitting Contribution

Before submitting any contribution type please make sure it adheres to the OPA on AWS [architecture](/website/docs/techdocs/architecture.md)

### Contributing an OPA on AWS provider

Questions to consider when designing new provider:
1. Why do i need a new provider? does the existing providers support the type of application I'm trying to build?
2. What is the common environment this provider support for applications?
3. Does the new provider type supports multiple applications that share the same requirements?
4. Do i have clarity on the roles and permissions required to implement this provider?
5. Do i have clarity on the resources and architecture required to implement this provider?
6. Will this provider support backwards upgrades? what will be the effect of applications if the provider were to be updated?

#### Build your provider
**Step 1**<br/>
Start with designing the architecture that will meet the particular type of workloads this provider needs to support. <br/>
Express the architecture with your choice of IAC(CDK, TF, Pulumi etc.)

:::idea
example: building an ECS provider - will require an AWS ECS cluster - which also requires a VPC and support for logs, encryption and load balancer to allow access to the containers. an AWS ECR is also required to store the container images.
:::

**Step 2**<br/>
Define the *Provisioning role* and *Operations role* permissions - this needs to be reason with the expected user interactions and IAC requirements. It is best practice to set your roles with least privileges permissions.

**Step 3**<br/>
Configure an appropriate pipeline to deploy and update this provider

**Step 4**<br/>
Create a provider backstage template and load the template to the backstage-reference repository
:::tip
Don't forget to update all-templates.yaml with your new template path
:::

#### Test your provider
**Step 1**<br/>
Make sure you are able to provision your new provider template.
We highly recommend to test different context for this step as described in the [test-cases](/website/docs/tests.md)

**Step 2**<br/>
Make sure you can update the provider configurations or IAC and the pipeline will apply the changes succufully 

**Step 3**<br/>
Add entries in  [test-cases](/website/docs/tests.md) document for the new provider implemented.

#### Submit your PR
Submit a pull request for the new provider following the instructions in this page.


### Contributing an OPA on AWS application

Questions to consider when designing a new application pattern:

1. Who is the team that going to be using this application template? does it address their requirements?
2. What pattern this new application introduce? is there already an existing pattern that can be used? 
3. Does this application can use an existing environment or it requires a new environment type / provider? if so, see the above *Contributing an OPA on AWS provider*
4. What kind of permissions and resources this application needs?
5. What kind of operational actions this application need? which of them can be supported through a pipeline and which one needs a UI of platform changes?
6. Will this application support upgrades? what will be the effect of the deployed applications if we were to be update it?

#### Build your application
**Step 1**<br/>
Start with designing the architecture that for this type of workload, this include the desired runtime(Java, .Net, python etc.), the resource that compose this application express by IAC(CDK, TF, Pulumi)

:::idea
example: building an ECS application - will require an AWS ECS Task and Task definition , in addition the application log will need a log group and you may need to add additional supporting resources such as RDS database or S3 bucket. The application IAC will have dependencies on expected resources such as an existing VPC or ECS cluster. this will be provided by the corresponding selected environment and injected to the application repository. the pipeline will stich all this together and express those arguments as environment variables
:::

**Step 2**<br/>
Define the identity of the application in a shape of an IAM role. This application identity role is used not only to describe the current permission the application needs but also the future permission the application may be granted as a result of the *resource binding* process.

:::tip
Make sure you IAC supports external ingestion of JSON permission policies. [See DeclareJSONStatements example here](https://github.com/awslabs/app-development-for-backstage-io-on-aws/blob/main/backstage-reference/common/aws_ecs/src/cdk-ecs-module-stack.ts)
:::

**Step 3**<br/>
Configure an appropriate pipeline to deploy and update this application

**Step 4**<br/>
Create an application backstage template and load the template to the backstage-reference repository
:::tip
Don't forget to update all-templates.yaml with your new template path
:::

#### Test your application
**Step 1**<br/>
Make sure you are able to provision your new application template.
We highly recommend to test different context for this step as described in the [test-cases](/website/docs/tests.md).
You should also test provisioning another application on the same environment to make sure there's not conflict of configurations and/or resources.

**Step 2**<br/>
1. Make sure you can update the application configurations or IAC and the pipeline will apply the changes successfully
2. Make sure you can update the application code /src and CD pipeline will build and deploy the new application  

**Step 3**<br/>
Add entries in  [test-cases](/website/docs/tests.md) document for the new application implemented.

#### Submit your PR
Submit a pull request for the new provider following the instructions in this page.