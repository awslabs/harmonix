---
sidebar_position: 4
---

# Cluster Access

In order to provision and perform operations on kubernetes environments and applications, OPA needs kubernetes RBAC permissions. OPA accomplishes this by first assuming an IAM role and then retrieving a kubernetes token based on that role. EKS enables the mechanism of mapping an IAM role to kubernetes RBAC permissions. The mapping between an IAM role and a kubernetes principal is configured in the "aws-auth" ConfigMap in the kube-system namespace.

## 2 Levels of Access

OPA makes use of 2 different levels of access when it talks to the kubernetes API server. The first level has cluster-wide administrator access and the second has admin access that is limited to a specific kubernetes namespace.

OPA uses the cluster-wide admin privileges in these scenarios:
  1. Provisioning environment providers
  1. Application CICD pipelines

When you create a new environment provider, OPA will ask you what IAM role you want to use for cluster administration. If you do not provide an existing role, OPA will create one for you. This IAM role is mapped to have full administrative privileges to execute any kubernetes API calls.

OPA uses namespace-limited administrative access to perform lookups and operations on applications. For example, when a developer selects an application in the OPA UI, all reads and writes to Kubernetes that are performed by OPA to support this UI are done using an IAM role that can only see and update kubernetes resources that are assigned to that namespace.

The IAM role that is granted namespace-limited access is determined when a developer sets up an application to run on an OPA environment. OPA will accept an existing IAM role to be provided or it can create the namespace-limited role if desired. It then takes care of updating the aws-auth ConfigMap so that the IAM role is associated with the right kubernetes principal.

## User Access To The Kubernetes API

Users typically interact with the kubernetes API server using kubectl. OPA does not prevent using kubectl in any way. Users can continue to get a kubectl session the same way as they always did.

OPA does allow for one more interesting possibility - it is possible to allow human beings to use the same permissions that OPA does. To enable this, administrators can grant access for users to assume the same AWS IAM role(s) that OPA does. Once they are logged into AWS with a cluster admin or namespace-limited admin role, they can exchange their IAM principal for a token that will allow them to use kubectl.

As prerequisites, users will need to have kubectl and the [AWS CLI](https://aws.amazon.com/cli/) installed on their machines. Once this is done, they can configure kubectl to talk to their EKS cluster using the following command. Make sure you fill in a real value for the region and cluster name.

```
aws eks update-kubeconfig --region <my-cluster-region> --name <my-cluster-name>
```

Another valuable way that OPA IAM roles can be used by humans is for accessing the AWS Web console. By logging into the console as an OPA IAM role, users would be able to go to the EKS service and view their cluster. EKS provides a dashboard that shows many configurations and allows users to see what resources are deployed to their cluster. If users log in with a cluster admin role, they can see everything in the cluster, but if they log in with a namespace-limited role, they will only be able to see the cluster resources that are contained in that namespace.

