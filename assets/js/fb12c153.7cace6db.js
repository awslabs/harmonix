"use strict";(self.webpackChunk_aws_harmonix_on_aws_website=self.webpackChunk_aws_harmonix_on_aws_website||[]).push([[7662],{6788:(e,i,t)=>{t.r(i),t.d(i,{assets:()=>d,contentTitle:()=>a,default:()=>p,frontMatter:()=>o,metadata:()=>s,toc:()=>c});var n=t(4848),r=t(8453);const o={sidebar_position:2},a="Git",s={id:"integration/git",title:"Git",description:"Introduction",source:"@site/docs/integration/git.md",sourceDirName:"integration",slug:"/integration/git",permalink:"/docs/integration/git",draft:!1,unlisted:!1,tags:[],version:"current",sidebarPosition:2,frontMatter:{sidebar_position:2},sidebar:"tutorialSidebar",previous:{title:"AWS Control Tower and AFT",permalink:"/docs/integration/control-tower-and-aft"},next:{title:"Migrations",permalink:"/docs/category/migrations"}},d={},c=[{value:"Introduction",id:"introduction",level:3},{value:"Architecture",id:"architecture",level:2},{value:"Git provider interface",id:"git-provider-interface",level:2},{value:"Attaching a new git provider",id:"attaching-a-new-git-provider",level:2},{value:"Adding a new git provider type",id:"adding-a-new-git-provider-type",level:3},{value:"Registering a new git provider",id:"registering-a-new-git-provider",level:3}];function l(e){const i={a:"a",admonition:"admonition",code:"code",em:"em",h1:"h1",h2:"h2",h3:"h3",header:"header",li:"li",mermaid:"mermaid",ol:"ol",p:"p",pre:"pre",...(0,r.R)(),...e.components};return(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(i.header,{children:(0,n.jsx)(i.h1,{id:"git",children:"Git"})}),"\n",(0,n.jsx)(i.h3,{id:"introduction",children:"Introduction"}),"\n",(0,n.jsx)(i.p,{children:"This article will describe how Harmonix on AWS integrates with various git providers including Gitlab and Github. In addition, we provide a deeper dive and customization examples to add your own git provider."}),"\n",(0,n.jsx)(i.h2,{id:"architecture",children:"Architecture"}),"\n",(0,n.jsx)(i.mermaid,{value:"graph TD;\n    GitProviderInterface--\x3eGitLabImpl;\n    GitProviderInterface--\x3eGitHubImpl;\n    GitProviderInterface--\x3eBitBucketImpl;\n    Harmonix-Backend-Plugin--\x3eGitProviderInterface"}),"\n",(0,n.jsx)(i.h2,{id:"git-provider-interface",children:"Git provider interface"}),"\n",(0,n.jsx)(i.p,{children:"Currently, Harmonix on AWS offers two git implementations:"}),"\n",(0,n.jsxs)(i.ol,{children:["\n",(0,n.jsx)(i.li,{children:"GitLab"}),"\n",(0,n.jsx)(i.li,{children:"GitHub"}),"\n"]}),"\n",(0,n.jsxs)(i.p,{children:["However, you can implement additional git providers and customize the backend plugin: @aws/plugin-aws-apps-backend-for-backstage .\nThe Git provider interface ",(0,n.jsx)(i.em,{children:"ISCMBackendAPI"})," exposes five methods that are required to be implemented to enable a new git provider."]}),"\n",(0,n.jsx)(i.p,{children:"SCMBackendAPI.ts ->"}),"\n",(0,n.jsx)(i.pre,{children:(0,n.jsx)(i.code,{className:"language-typescript",children:"export interface ISCMBackendAPI {\n    deleteRepository: (repo: IRepositoryInfo , accessToken: string) => Promise<IGitAPIResult>;\n    createRepository: (repo: IRepositoryInfo, accessToken: string) =>  Promise<IGitAPIResult>;\n    getFileContent: (filePath: string, repo: IRepositoryInfo, accessToken: string) =>  Promise<IGitAPIResult>;\n    commitContent: (change:ICommitChange, repo: IRepositoryInfo, accessToken: string) =>  Promise<IGitAPIResult>;\n}\n"})}),"\n",(0,n.jsx)(i.p,{children:"A new git provider will need to implement the above methods. You can review the existing implementation examples here:"}),"\n",(0,n.jsx)(i.pre,{children:(0,n.jsx)(i.code,{className:"language-tree",children:"\u251c\u2500\u2500 aws-apps-backend\n\u2502   \u2514\u2500\u2500 src\n      \u251c\u2500\u2500 api\n      \u2502\xa0\xa0 \u251c\u2500\u2500 AwsAppsApi.ts\n      \u2502\xa0\xa0 \u251c\u2500\u2500 **github-api.ts**\n      \u2502\xa0\xa0 \u251c\u2500\u2500 **gitlab-api.ts**\n      \u2502\xa0\xa0 \u2514\u2500\u2500 index.ts\n      \u251c\u2500\u2500 index.ts\n"})}),"\n",(0,n.jsx)(i.h2,{id:"attaching-a-new-git-provider",children:"Attaching a new git provider"}),"\n",(0,n.jsx)(i.h3,{id:"adding-a-new-git-provider-type",children:"Adding a new git provider type"}),"\n",(0,n.jsxs)(i.p,{children:["In the common plugin @aws/plugin-aws-apps-common-for-backstage , edit the file /src/types/",(0,n.jsx)(i.em,{children:"git-providers.ts"}),"\nexample: adding BitBucket:"]}),"\n",(0,n.jsx)(i.pre,{children:(0,n.jsx)(i.code,{className:"language-typescript",children:'export enum GitProviders {\n    GITLAB = "gitlab",\n    GITHUB = "github",\n    UNSET = "unset"\n    BITBUCKET = "bitbucket"\n  }\n'})}),"\n",(0,n.jsx)(i.h3,{id:"registering-a-new-git-provider",children:"Registering a new git provider"}),"\n",(0,n.jsxs)(i.p,{children:["In the backend plugin @aws/plugin-aws-apps-backend-for-backstage, edit the file /src/api/",(0,n.jsx)(i.em,{children:"git-api.ts"}),"\nAdd your new git provider and register your implementation.\nexample: Adding BitBucket"]}),"\n",(0,n.jsx)(i.pre,{children:(0,n.jsx)(i.code,{className:"language-typescript",children:"import { GitProviders, ISCMBackendAPI } from '@aws/plugin-aws-apps-common-for-backstage';\nimport { GitLabAPI } from './gitlab-api';\nimport { GitHubAPI } from './github-api';\n// Add your impl here\nimport { GitBitBucketAPI } from './gitbit-bucket-api';\nimport { LoggerService } from '@backstage/backend-plugin-api';\n\n\npublic constructor(\n        readonly logger: LoggerService,\n        readonly gitProvider: GitProviders\n      ) {\n        this.logger = logger;\n        this.gitProvider = gitProvider;\n        this.logger.info(`Instantiating GitAPI with ${gitProvider}...`);\n        if (gitProvider === GitProviders.GITLAB) {\n          this.git = new GitLabAPI(logger);\n        }else if (gitProvider === GitProviders.GITHUB) {\n          this.git =  new GitHubAPI(logger);\n         } \n         else if (gitProvider === GitProviders.BITBUCKET) {\n          this.git =  new GitBitBucketAPI(logger);\n         } \n         else if (gitProvider === GitProviders.UNSET) {\n          this.git =  new GitHubAPI(logger);\n         } \n         else\n         {\n            throw new Error(\"Invalid / unsupported Git Provider\");\n         }\n      }\n\n"})}),"\n",(0,n.jsx)(i.admonition,{type:"info",children:(0,n.jsxs)(i.p,{children:["Adding a git provider will allow Harmonix on AWS to preform the same actions based on your implementation, However you will still need to to implement the corresponding pipelines to complete the event execution. Please see the ",(0,n.jsx)(i.a,{href:"https://github.com/awslabs/harmonix/tree/main/backstage-reference/common/cicd",children:"GitLabs pipelines examples"})," we provide as a reference for your desired pipeline tool."]})}),"\n",(0,n.jsx)(i.admonition,{type:"tip",children:(0,n.jsxs)(i.p,{children:["Don't forget to add your new git provider to backstage ",(0,n.jsx)(i.em,{children:"app_config.yaml"})," under /catalog/provider/bitbucket. ",(0,n.jsx)(i.a,{href:"https://backstage.io/docs/integrations/bitbucketCloud/discovery#configuration",children:"backstage documentation"})]})})]})}function p(e={}){const{wrapper:i}={...(0,r.R)(),...e.components};return i?(0,n.jsx)(i,{...e,children:(0,n.jsx)(l,{...e})}):l(e)}},8453:(e,i,t)=>{t.d(i,{R:()=>a,x:()=>s});var n=t(6540);const r={},o=n.createContext(r);function a(e){const i=n.useContext(o);return n.useMemo((function(){return"function"==typeof e?e(i):{...i,...e}}),[i,e])}function s(e){let i;return i=e.disableParentContext?"function"==typeof e.components?e.components(r):e.components||r:a(e.components),n.createElement(o.Provider,{value:i},e.children)}}}]);