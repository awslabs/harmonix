import { GitProviders, IRepositoryInfo } from "../types"
import { Entity } from '@backstage/catalog-model';

export const getRepoUrl= (repoInfo: IRepositoryInfo) : string => {
  console.log(repoInfo);
  let gitRepoClean;
  if (repoInfo.gitRepoName.includes('/'))
  {
    gitRepoClean = repoInfo.gitRepoName.split('/')[1]
  }
  else
  {
    gitRepoClean = repoInfo.gitRepoName
  }

    if (repoInfo.gitProvider===GitProviders.GITLAB) 
    {
        if (repoInfo.gitProjectGroup)
        {
            return (repoInfo.gitHost + "/" + repoInfo.gitProjectGroup + "/" + gitRepoClean + ".git")
        }
        else
        {
            return (repoInfo.gitHost + "/" + repoInfo.gitRepoName + ".git")
        }
        
    }
    else if (repoInfo.gitProvider===GitProviders.GITHUB)
    {
        if (repoInfo.gitOrganization)
        {
            return (repoInfo.gitHost + "/" + repoInfo.gitOrganization + "/" + gitRepoClean + ".git")
        }
        else
        {
            return (repoInfo.gitHost + "/" + repoInfo.gitRepoName) + ".git"
        }
    }
    else
    {
        throw Error("Unsupported git provider " + repoInfo.gitProvider);
    }
   
  }

export const getRepoInfo = (entity:Entity) : IRepositoryInfo => {
    // let gitProvider: GitProviders = GitProviders.GITLAB;
    let gitProvider = entity.metadata["gitProvider"] ?? GitProviders.GITLAB;
    
    // switch (entity.metadata["gitProvider"]){
    //   case "github":
    //     gitProvider = GitProviders.GITHUB
    //     break;
    //   case "gitlab":
    //     gitProvider = GitProviders.GITLAB
    //     break;
    //   default:
    //     throw Error("Unsupported git provider: " + entity.metadata["gitProvider"])
    // }

    switch (gitProvider) {
      case GitProviders.GITLAB:
        return {
          gitProvider,
          gitHost: entity.metadata.annotations ? entity.metadata.annotations['gitlab.com/instance']?.toString() : "",
          gitRepoName: entity.metadata.annotations ? entity.metadata.annotations['gitlab.com/project-slug']?.toString() : "",
          gitProjectGroup: entity.metadata.annotations ? entity.metadata.annotations['gitlab.com/project-slug']?.toString().split('/')[0] : "",
          isPrivate: true
        }
      case GitProviders.GITHUB:
        return {
          gitHost: "github.com",
          gitRepoName: entity.metadata.annotations ? entity.metadata.annotations['github.com/project-slug']?.toString().split('/')[1] : "",
          gitOrganization: entity.metadata.annotations ? entity.metadata.annotations['github.com/project-slug']?.toString().split('/')[0] : "",
          gitProvider,
          isPrivate: true
        }
      default:
        throw Error("Unsupported git provider: " + entity.metadata["gitProvider"])
    }

  };

export const getGitCredentailsSecret= (repoInfo: IRepositoryInfo) : string => {
    if (repoInfo.gitProvider===GitProviders.GITLAB) 
    {
        return 'opa-admin-gitlab-secrets'
    }
    else if (repoInfo.gitProvider===GitProviders.GITHUB)
    {
        return 'opa-admin-github-secrets'
    }
    else
    {
        throw Error("Unsupported git provider " + repoInfo.gitProvider);
    }
   
  }