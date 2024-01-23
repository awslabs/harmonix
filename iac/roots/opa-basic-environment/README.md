# OPA
## Intro
This CDK Stack deploy a new backend environment to support the OPA solution. for further details refer to :
1. [GitHub Repo](https://github.com/awslabs/app-development-for-backstage-io-on-aws)
2. [YouTube Channel](https://www.youtube.com/playlist?list=PLhr1KZpdzukemoBUAPNUMCgGk88pdURJB)

## Installation

1. Option 1 - CLI - using your favorite terminal execute the below make command
```bash
make deploy
```
2. Option 2 - CloudFormation - In order to deploy the stack it first must be generated
   1. Synthesized the stack
        ```
        cdk synth
        ``` 
   2.  use the generated stack in CF template and provide the required parameters. [Additional Information](https://aws.amazon.com/blogs/infrastructure-and-automation/deploy-cloudformation-stacks-at-the-click-of-a-button/)


## What's included?

