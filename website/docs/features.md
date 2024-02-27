---
sidebar_position: 8
---

# Features

## Templates

### Providers

<div class="templates">
<table>
<tr>
    <td width="20%" align="center">
        <img src="/img/features/ecs-ec2-provider.png"/>
    </td>
    <td width="20%" align="center">
          <img src="/img/features/ecs-provider.png"/>
    </td>
    <td width="20%" align="center">
          <img src="/img/features/eks-provider.png"/>
    </td>
    <td width="20%" align="center">
         <img src="/img/features/serverless-provider.png"/>
    </td>
    <td width="20%" align="center">
         <img src="/img/features/aws-environment.png"/>
    </td>
</tr>
<tr>
    <td width="20%" align="center">
        <img src="/img/features/genai-provider.png"/>
    </td>
    <td width="20%" align="center">
    </td>
    <td width="20%" align="center"> 
    </td>
    <td width="20%" align="center">  
    </td>
    <td width="20%" align="center">
    </td>
</tr>
</table>
</div>

### AWS Shared Resources
<div class="templates">
<table>
<tr>
    <td width="20%" align="center">
        <img src="/img/features/aws-rds.png"/>
    </td>
    <td width="20%" align="center">
          <img src="/img/features/aws-s3.png"/>
    </td>
    <td align="center">
    </td>
     <td align="center">
    </td>
     <td align="center">
    </td>
</tr>
</table>
</div>

### Apps
<div class="templates">
<table>
<tr>
    <td width="20%" align="center">
        <img  src="/img/features/k8s-node-helm-rds.png"/>
    </td>
    <td width="20%" align="center">
          <img src="/img/features/k8s-node-kustomize-rds.png"/>
    </td>
     <td width="20%" align="center">
        <img  src="/img/features/node-micro.png"/>
    </td>
     <td width="20%" align="center">
        <img  src="/img/features/node-tf.png"/>
    </td>
     <td width="20%" align="center">
        <img src="/img/features/node-ecs-rds.png"/>
    </td>
</tr>
<tr>
    <td width="20%" align="center">
        <img src="/img/features/ecs-python-flask.png"/>
    </td>
    <td width="20%" align="center">
          <img src="/img/features/k8s-flask-kustomize.png"/>
    </td>
     <td width="20%"  align="center">
        <img src="/img/features/serverless-rest.png"/>
    </td>
     <td width="20%" align="center">
        <img src="/img/features/k8s-java.png"/>
    </td>
     <td width="20%" align="center">
        <img src="/img/features/ecs-java.png"/>
    </td>
</tr>
<tr>
    <td width="20%" align="center">
        <img src="/img/features/genai-rag-app.png"/>
    </td>
    <td width="20%" align="center">
    </td>
     <td width="20%"  align="center">
    </td>
     <td width="20%" align="center">
    </td>
     <td width="20%" align="center">
    </td>
</tr>
</table>
</div>





## Platform Engineer Features

### Add/Remove providers
Allow the platform engineer to configure environments with multiple providers.
<br/>
**Use case**: a platform engineer design an environment where application should be running on two regions for resiliency purposes. Two providers with different regions can be associated to the same environment.
<br/>
**Use case**: a platform engineer design an environment where application needs to be access by local regional teams. Two providers with different regions can be associated to the same environment.

:::info
Once at least one provider is selected, you can add more providers of the same type: ie: ECS->ECS, EKS->EKS, Serverless->Serverless
:::

<br/>

<img  src="/img/features/multi-providers.png"/>

### Delete providers / environments
Allow the platform engineer to delete a provider or environment and their associated resources.

<div class="templates">
<table>
<tr>
    <td width="50%" align="center">
        <img  src="/img/features/delete-provider.png"/>
    </td>
    <td width="50%" align="center">
          <img src="/img/features/delete-environment.png"/>
    </td>
</tr>
</table>
</div>

### Segregated auditing
Allow separation of audit logs for each environment. Audit logs are created only for the applications which run on the particular environment provider. 

### Deployment requires approval
Configure additional control for sensitive environment when automated deployment is not desired. If requires approval is set to the environment - all application pipelines deployed on this environment will require approval before proceeding.

<img width="60%" src="/img/features/require-approval.png"/>

## Application developer Features
### Resource binding
Allow the application developer to bind shared AWS resources to an application to it can access the shared resource.

<img  src="/img/features/resource-binding.png"/>

### Deploy application to additional environments
Allow the application developer to deploy an application to additional environments

<img width="60%" src="/img/features/deploy-env.png"/>

### Toggle between the environments
Allow the application developer to toggle between the environments of which an application is deployed and present relevant information for the current selected environment 

<img width="60%" src="/img/features/toggle-env.png"/>

### Delete an App
Delete an application from one or many environments.

<img width="60%" src="/img/features/delete-app.png"/>

### App Development
1. Clone repository: The ability to clone the repository immediately after it was created without waiting for the pipeline to provision the infrastructure
2. Start & stop App: For containerize application - the ability to stop / start the application.
3. Update & delete App: For Serverless application - deploy or remove the API
4. Change application environment variables
5. View related AWS app cloud resources: View related application resources that have been provisioned for this app
6. View application logs: View the CloudWatch logs for the application
7. Visualize application software catalog relationship: View the application relationships including environments, shared resources and owners
8. View application  CI/CD pipelines: View the application CI/CD pipelines
