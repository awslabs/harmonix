---
sidebar_position: 1
---

# New Cluster Template

The "AWS EKS Environment Provider" template will create everything OPA needs to provision an EKS runtime. This includes creating and configuring the EKS cluster. You can customize this template to best suit your standards or use it as a reference to create your own template from scratch. The template itself allows for the user to make choices with respect to infrastructure creation. 

#### Template Choice Examples
  * Create an EKS cluster that is made up of managed nodes or utilize a serverless approach with Fargate. 
  * Have the IaC create a new VPC for you or use an existing one. 
  * Expose your cluster's API publicly or to keep it private. 
  * Create an IAM role that can be used for cluster administration (both EKS and kubernetes administration) or supply your own existing IAM role if you do not want the template to create one for you.

#### Screenshot of the AWS EKS Environment Provider Template:
<p align="center">
![eks_new_cluster.png](/img/opa/providers/eks_new_cluster.png)
</p>

## AWS Infrastructure Created By This Template

#### Standard OPA Provider Components:
- IAM Roles
  - OPA Operations Role
    * Has sufficient permissions to perform operations on the environment provider's resources
  - OPA Provisioning Role
    * Has sufficient permissions to provision the environment provider's resources
- Audit Table
  * A dedicated DynamoDB table to capture the actions performed on the applications that are running on this environment provider.
- VPC
  * Created unless an existing VPC ID is provided by the user

#### EKS-specific Provider Components:
- Security Groups
  * Allow communication between kubernetes worker nodes and the API server
- EKS Cluster
- OIDC Provider
  * A cluster-specific OIDC provider that is used for pods to assume IAM roles
  * [More information on IAM Roles for Service Accounts](https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html)
- IAM Roles
  - EKS Cluster Role
    * Role that provides permissions for the Kubernetes control plane to make calls to AWS API operations on your behalf.
  - Cluster Node Role
    *	Gives permissions to the kubelet running on the node to make calls to other APIs on your behalf. This includes permissions to access container registries where your application containers are stored.
  - Pod Execution Role (Fargate Only)
    * The pod execution role to use for pods that match the selectors in the Fargate profile. The pod execution role allows Fargate infrastructure to register with your cluster as a node, and it provides read access to Amazon ECR image repositories.
  - Cluster Admin Role
    * Has EKS cluster administration privileges
    * Configured in aws-auth ConfigMap so that it has k8s cluster admin privileges
    * Used by CICD during provisioning provider resources
    * Can be assumed by administrators as well if its trust policy is customized
- EC2 Instances
  * Provisioned for use as cluster nodes
  * Only created if the user chose to use Managed Nodes instead of Fargate for the cluster
- Kubectl Lambda Function
  * A lambda function used for configuring and querying kubernetes cluster resources, including installing Helm charts
  * This function runs in the same VPC as the EKS cluster so that it can communicate with the kubernetes API server even if the API server is not exposed publicly
  * Used by Infrastructure as Code (IaC) that adds/updates resources on the EKS cluster
    * For example, OPA's EKS Environment Provider templates run CDK code to configure cluster resources
  * OPA uses this lambda function to update and query the EKS cluster instead of using direct calls to the API server
  * This function makes use of kubectl (by way of a [lambda layer](https://docs.aws.amazon.com/lambda/latest/dg/chapter-layers.html)). The version of kubectl it uses must be compatible with the kubernetes cluster version. If you update your kubernetes cluster version, you should also update the kubectl lambda layer so that the kubectl client version matches your cluster.
  
#### OPA Uses of the Kubectl Lambda Function:
<p align="center">
![kubectl_lambda.png](/img/opa/providers/kubectl_lambda.png)
</p>

#### Kubernetes Components Created/Configured By This Template

* [AWS Load Balancer Controller](https://docs.aws.amazon.com/eks/latest/userguide/aws-load-balancer-controller.html)
  * A controller that will create AWS Load Balancers based on Kubernetes configurations
* [FluentBit](https://fluentbit.io/)
  * Configured to forward pod logs to AWS Cloudwatch logs

  :::info
  The OPA UI has a Logs tab that can show an application's logs from a particular environment. If the cluster is not set up to have FluentBit (or a similar tool such as Fluentd) send application logs to CloudWatch, this functionality will not work.
  :::

* ClusterRoleBinding
  * This binds the principal that OPA uses to administer the cluster ("opa-cluster-admin") to the ClusterRole that has cluster-wide admin permissions
* ClusterRole for viewing/listing namespaces
  * OPA application operations make use of this ClusterRole
* aws-auth ConfigMap settings
  * The aws-auth ConfigMap is updated to configure a k8s principal for OPA to use to perform cluster and application provisioning
