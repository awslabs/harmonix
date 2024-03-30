"use strict";(self.webpackChunk_aws_opa_on_aws_website=self.webpackChunk_aws_opa_on_aws_website||[]).push([[5189],{29023:(e,n,s)=>{s.r(n),s.d(n,{assets:()=>a,contentTitle:()=>o,default:()=>u,frontMatter:()=>i,metadata:()=>l,toc:()=>c});var t=s(74848),r=s(28453);const i={sidebar_position:1},o="New Cluster Template",l={id:"techdocs/runtimes/kubernetes/eksProviderTemplates/newClusterTemplate",title:"New Cluster Template",description:'The "AWS EKS Environment Provider" template will create everything OPA needs to provision an EKS runtime. This includes creating and configuring the EKS cluster. You can customize this template to best suit your standards or use it as a reference to create your own template from scratch. The template itself allows for the user to make choices with respect to infrastructure creation.',source:"@site/docs/techdocs/runtimes/kubernetes/eksProviderTemplates/newClusterTemplate.md",sourceDirName:"techdocs/runtimes/kubernetes/eksProviderTemplates",slug:"/techdocs/runtimes/kubernetes/eksProviderTemplates/newClusterTemplate",permalink:"/docs/techdocs/runtimes/kubernetes/eksProviderTemplates/newClusterTemplate",draft:!1,unlisted:!1,tags:[],version:"current",sidebarPosition:1,frontMatter:{sidebar_position:1},sidebar:"tutorialSidebar",previous:{title:"EKS Provider Templates",permalink:"/docs/category/eks-provider-templates"},next:{title:"Import Cluster Template",permalink:"/docs/techdocs/runtimes/kubernetes/eksProviderTemplates/importClusterTemplate"}},a={},c=[{value:"Template Choice Examples",id:"template-choice-examples",level:4},{value:"Screenshot of the AWS EKS Environment Provider Template:",id:"screenshot-of-the-aws-eks-environment-provider-template",level:4},{value:"AWS Infrastructure Created By This Template",id:"aws-infrastructure-created-by-this-template",level:2},{value:"Standard OPA Provider Components:",id:"standard-opa-provider-components",level:4},{value:"EKS-specific Provider Components:",id:"eks-specific-provider-components",level:4},{value:"OPA Uses of the Kubectl Lambda Function:",id:"opa-uses-of-the-kubectl-lambda-function",level:4},{value:"Kubernetes Components Created/Configured By This Template",id:"kubernetes-components-createdconfigured-by-this-template",level:4}];function d(e){const n={a:"a",admonition:"admonition",h1:"h1",h2:"h2",h4:"h4",img:"img",li:"li",p:"p",ul:"ul",...(0,r.R)(),...e.components};return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(n.h1,{id:"new-cluster-template",children:"New Cluster Template"}),"\n",(0,t.jsx)(n.p,{children:'The "AWS EKS Environment Provider" template will create everything OPA needs to provision an EKS runtime. This includes creating and configuring the EKS cluster. You can customize this template to best suit your standards or use it as a reference to create your own template from scratch. The template itself allows for the user to make choices with respect to infrastructure creation.'}),"\n",(0,t.jsx)(n.h4,{id:"template-choice-examples",children:"Template Choice Examples"}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"Create an EKS cluster that is made up of managed nodes or utilize a serverless approach with Fargate."}),"\n",(0,t.jsx)(n.li,{children:"Have the IaC create a new VPC for you or use an existing one."}),"\n",(0,t.jsx)(n.li,{children:"Expose your cluster's API publicly or to keep it private."}),"\n",(0,t.jsx)(n.li,{children:"Create an IAM role that can be used for cluster administration (both EKS and kubernetes administration) or supply your own existing IAM role if you do not want the template to create one for you."}),"\n"]}),"\n",(0,t.jsx)(n.h4,{id:"screenshot-of-the-aws-eks-environment-provider-template",children:"Screenshot of the AWS EKS Environment Provider Template:"}),"\n",(0,t.jsx)("p",{align:"center",children:(0,t.jsx)(n.p,{children:(0,t.jsx)(n.img,{alt:"eks_new_cluster.png",src:s(86404).A+"",width:"1938",height:"1418"})})}),"\n",(0,t.jsx)(n.h2,{id:"aws-infrastructure-created-by-this-template",children:"AWS Infrastructure Created By This Template"}),"\n",(0,t.jsx)(n.h4,{id:"standard-opa-provider-components",children:"Standard OPA Provider Components:"}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsxs)(n.li,{children:["IAM Roles","\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsxs)(n.li,{children:["OPA Operations Role","\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"Has sufficient permissions to perform operations on the environment provider's resources"}),"\n"]}),"\n"]}),"\n",(0,t.jsxs)(n.li,{children:["OPA Provisioning Role","\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"Has sufficient permissions to provision the environment provider's resources"}),"\n"]}),"\n"]}),"\n"]}),"\n"]}),"\n",(0,t.jsxs)(n.li,{children:["Audit Table","\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"A dedicated DynamoDB table to capture the actions performed on the applications that are running on this environment provider."}),"\n"]}),"\n"]}),"\n",(0,t.jsxs)(n.li,{children:["VPC","\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"Created unless an existing VPC ID is provided by the user"}),"\n"]}),"\n"]}),"\n"]}),"\n",(0,t.jsx)(n.h4,{id:"eks-specific-provider-components",children:"EKS-specific Provider Components:"}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsxs)(n.li,{children:["Security Groups","\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"Allow communication between kubernetes worker nodes and the API server"}),"\n"]}),"\n"]}),"\n",(0,t.jsx)(n.li,{children:"EKS Cluster"}),"\n",(0,t.jsxs)(n.li,{children:["OIDC Provider","\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"A cluster-specific OIDC provider that is used for pods to assume IAM roles"}),"\n",(0,t.jsx)(n.li,{children:(0,t.jsx)(n.a,{href:"https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html",children:"More information on IAM Roles for Service Accounts"})}),"\n"]}),"\n"]}),"\n",(0,t.jsxs)(n.li,{children:["IAM Roles","\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsxs)(n.li,{children:["EKS Cluster Role","\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"Role that provides permissions for the Kubernetes control plane to make calls to AWS API operations on your behalf."}),"\n"]}),"\n"]}),"\n",(0,t.jsxs)(n.li,{children:["Cluster Node Role","\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"Gives permissions to the kubelet running on the node to make calls to other APIs on your behalf. This includes permissions to access container registries where your application containers are stored."}),"\n"]}),"\n"]}),"\n",(0,t.jsxs)(n.li,{children:["Pod Execution Role (Fargate Only)","\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"The pod execution role to use for pods that match the selectors in the Fargate profile. The pod execution role allows Fargate infrastructure to register with your cluster as a node, and it provides read access to Amazon ECR image repositories."}),"\n"]}),"\n"]}),"\n",(0,t.jsxs)(n.li,{children:["Cluster Admin Role","\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"Has EKS cluster administration privileges"}),"\n",(0,t.jsx)(n.li,{children:"Configured in aws-auth ConfigMap so that it has k8s cluster admin privileges"}),"\n",(0,t.jsx)(n.li,{children:"Used by CICD during provisioning provider resources"}),"\n",(0,t.jsx)(n.li,{children:"Can be assumed by administrators as well if its trust policy is customized"}),"\n"]}),"\n"]}),"\n"]}),"\n"]}),"\n",(0,t.jsxs)(n.li,{children:["EC2 Instances","\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"Provisioned for use as cluster nodes"}),"\n",(0,t.jsx)(n.li,{children:"Only created if the user chose to use Managed Nodes instead of Fargate for the cluster"}),"\n"]}),"\n"]}),"\n",(0,t.jsxs)(n.li,{children:["Kubectl Lambda Function","\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"A lambda function used for configuring and querying kubernetes cluster resources, including installing Helm charts"}),"\n",(0,t.jsx)(n.li,{children:"This function runs in the same VPC as the EKS cluster so that it can communicate with the kubernetes API server even if the API server is not exposed publicly"}),"\n",(0,t.jsxs)(n.li,{children:["Used by Infrastructure as Code (IaC) that adds/updates resources on the EKS cluster","\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"For example, OPA's EKS Environment Provider templates run CDK code to configure cluster resources"}),"\n"]}),"\n"]}),"\n",(0,t.jsx)(n.li,{children:"OPA uses this lambda function to update and query the EKS cluster instead of using direct calls to the API server"}),"\n",(0,t.jsxs)(n.li,{children:["This function makes use of kubectl (by way of a ",(0,t.jsx)(n.a,{href:"https://docs.aws.amazon.com/lambda/latest/dg/chapter-layers.html",children:"lambda layer"}),"). The version of kubectl it uses must be compatible with the kubernetes cluster version. If you update your kubernetes cluster version, you should also update the kubectl lambda layer so that the kubectl client version matches your cluster."]}),"\n"]}),"\n"]}),"\n"]}),"\n",(0,t.jsx)(n.h4,{id:"opa-uses-of-the-kubectl-lambda-function",children:"OPA Uses of the Kubectl Lambda Function:"}),"\n",(0,t.jsx)("p",{align:"center",children:(0,t.jsx)(n.p,{children:(0,t.jsx)(n.img,{alt:"kubectl_lambda.png",src:s(36331).A+"",width:"574",height:"304"})})}),"\n",(0,t.jsx)(n.h4,{id:"kubernetes-components-createdconfigured-by-this-template",children:"Kubernetes Components Created/Configured By This Template"}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsxs)(n.li,{children:["\n",(0,t.jsx)(n.p,{children:(0,t.jsx)(n.a,{href:"https://docs.aws.amazon.com/eks/latest/userguide/aws-load-balancer-controller.html",children:"AWS Load Balancer Controller"})}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"A controller that will create AWS Load Balancers based on Kubernetes configurations"}),"\n"]}),"\n"]}),"\n",(0,t.jsxs)(n.li,{children:["\n",(0,t.jsx)(n.p,{children:(0,t.jsx)(n.a,{href:"https://fluentbit.io/",children:"FluentBit"})}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"Configured to forward pod logs to AWS Cloudwatch logs"}),"\n"]}),"\n",(0,t.jsx)(n.admonition,{type:"info",children:(0,t.jsx)(n.p,{children:"The OPA UI has a Logs tab that can show an application's logs from a particular environment. If the cluster is not set up to have FluentBit (or a similar tool such as Fluentd) send application logs to CloudWatch, this functionality will not work."})}),"\n"]}),"\n",(0,t.jsxs)(n.li,{children:["\n",(0,t.jsx)(n.p,{children:"ClusterRoleBinding"}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:'This binds the principal that OPA uses to administer the cluster ("opa-cluster-admin") to the ClusterRole that has cluster-wide admin permissions'}),"\n"]}),"\n"]}),"\n",(0,t.jsxs)(n.li,{children:["\n",(0,t.jsx)(n.p,{children:"ClusterRole for viewing/listing namespaces"}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"OPA application operations make use of this ClusterRole"}),"\n"]}),"\n"]}),"\n",(0,t.jsxs)(n.li,{children:["\n",(0,t.jsx)(n.p,{children:"aws-auth ConfigMap settings"}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"The aws-auth ConfigMap is updated to configure a k8s principal for OPA to use to perform cluster and application provisioning"}),"\n"]}),"\n"]}),"\n"]})]})}function u(e={}){const{wrapper:n}={...(0,r.R)(),...e.components};return n?(0,t.jsx)(n,{...e,children:(0,t.jsx)(d,{...e})}):d(e)}},86404:(e,n,s)=>{s.d(n,{A:()=>t});const t=s.p+"assets/images/eks_new_cluster-0a30ccc554f6453881d01ce5cd7cae37.png"},36331:(e,n,s)=>{s.d(n,{A:()=>t});const t=s.p+"assets/images/kubectl_lambda-7ba6e360cc4e87b5e5797b7e429bb84b.png"},28453:(e,n,s)=>{s.d(n,{R:()=>o,x:()=>l});var t=s(96540);const r={},i=t.createContext(r);function o(e){const n=t.useContext(i);return t.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function l(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(r):e.components||r:o(e.components),t.createElement(i.Provider,{value:n},e.children)}}}]);