import { IGitAPIResult, ICommitChange, IRepositoryInfo, ISCMBackendAPI } from "@aws/plugin-aws-apps-common-for-backstage/src/types/SCMBackendAPI";
import { LoggerService } from "@backstage/backend-plugin-api";

export class GitLabAPI implements ISCMBackendAPI {

    public constructor(
        private readonly logger: LoggerService
      ) {
        this.logger.info('Instantiating GitLabAPI...');
      }

    private async getGitProjectId(
        gitHost: string,
        gitProjectGroup: string,
        gitRepoName: string,
        accessToken: string,
        ): Promise<string> {
        let repoName;
        let groupName;

        if (gitRepoName.includes('/')) {
            groupName = gitRepoName.split('/')[0]
            repoName = gitRepoName.split('/')[1]
        }
        else
        {
            groupName=""
            repoName = gitRepoName;
        }
        const url = `https://${gitHost}/api/v4/projects?search=${repoName}`;
        const gitProjects = await fetch(url, {
            method: 'GET',
            headers: {
            'PRIVATE-TOKEN': accessToken,
            'Content-Type': 'application/json',
            },
        });
        const gitProjectsJson: { path_with_namespace: string; id: string }[] = await gitProjects.json();
        // console.log(gitProjectsJson)
        let project = null;
        if (gitProjectsJson) {
            project = gitProjectsJson.filter(
            project => project.path_with_namespace === `${groupName}/${repoName}`,
            )[0];
        }

        if (project && project.id) {
            return project.id;
        } else {
            throw new Error(`Failed to get git project ID for group '${gitProjectGroup}' and repo '${gitRepoName}'`);
        }
        }

    public async createRepository(repo: IRepositoryInfo, accessToken: string): Promise<IGitAPIResult> {
        // THIS IS NOT TESTED YET

        const url = `https://${repo.gitHost}/api/v4/projects/`;
        const body  = {
            "name": repo.gitRepoName,
            "description": repo.description || "",
            "path":  repo.gitProjectGroup? (repo.gitProjectGroup + "/" + repo.gitRepoName) : repo.gitRepoName,
            "initialize_with_readme": "true"
        }

        console.log(url);
        const createRepoResults = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                'PRIVATE-TOKEN': accessToken,
            },
            });
        console.log(createRepoResults);
        if (createRepoResults.status > 299) {
            this.logger.error('ERROR: Repository failed to create');
        return {
                isSuccuess: false,
                message: `Repository failed to create`,            
                httpResponse : createRepoResults.status,
                value:'FAILURE'
                }
        } else {
        return { 
            isSuccuess: true,
            message: `Repository created successfully`,            
            httpResponse : createRepoResults.status,
            value:'SUCCESS'
        };
        }  
    }

    public async deleteRepository(repo: IRepositoryInfo, accessToken: string) :  Promise<IGitAPIResult> {
        let gitProjectId: string = "";
        if (!repo.projectID)
        {
            gitProjectId = await this.getGitProjectId(repo.gitHost, repo.gitProjectGroup || "", repo.gitRepoName, accessToken);
            console.log(`Got GitLab project ID: ${gitProjectId} for ${repo.gitProjectGroup}/${repo.gitRepoName}`);
        }   
    
        // now delete the repo
        const url = `https://${repo.gitHost}/api/v4/projects/${gitProjectId}`;
        console.log(url);
        const deleteRepoResults = await fetch(url, {
        method: 'DELETE',
        headers: {
            'PRIVATE-TOKEN': accessToken,
        },
        });
        console.log(deleteRepoResults);
        if (deleteRepoResults.status > 299) {
            this.logger.error('ERROR: Repository failed to delete');
        return {
                isSuccuess: false,
                message: `Repository failed to delete`,            
                httpResponse : deleteRepoResults.status,
                value:'FAILURE'
                }
        } else {
        return { 
            isSuccuess: true,
            message: `Repository deleted successfully`,            
            httpResponse : deleteRepoResults.status,
            value:'SUCCESS'
        };
        }
    }

    public async getFileContent(filePath: string, repo: IRepositoryInfo, accessToken: string): Promise<IGitAPIResult> {
        let gitProjectId: string = "";
        if (!repo.projectID)
        {
            gitProjectId = await this.getGitProjectId(repo.gitHost, repo.gitProjectGroup || "", repo.gitRepoName, accessToken);
            console.log(`Got GitLab project ID: ${gitProjectId} for ${repo.gitProjectGroup}/${repo.gitRepoName}`);
        }   

        const url = `https://${repo.gitHost}/api/v4/projects/${gitProjectId}/repository/files/${filePath}?ref=main`;
        const result = await fetch(new URL(url), {
        method: 'GET',
        headers: {
            'PRIVATE-TOKEN': accessToken,
            'Content-Type': 'application/json',
        },
        });

        const resultBody = await result.json();
        if (result.status > 299) {
            this.logger.error(`ERROR: Failed to retrieve ${filePath} for ${repo.gitRepoName}. Response code: ${result.status} - ${resultBody}`);
            return {
                isSuccuess: false,
                message: `ERROR: Failed to retrieve ${filePath} for ${repo.gitRepoName}. Response code: ${result.status} - ${resultBody}`,            
                httpResponse : result.status,
                value:'FAILURE'
                }
        } else {
            return { 
                isSuccuess: true,
                message: `Retrieved file content successfully`,            
                httpResponse : result.status,
                value:resultBody.content
            };
        }
    }

    public async commitContent(change: ICommitChange, repo: IRepositoryInfo, accessToken: string): Promise<IGitAPIResult> {
        let gitProjectId: string = "";
        if (!repo.projectID)
        {
            gitProjectId = await this.getGitProjectId(repo.gitHost, repo.gitProjectGroup || "", repo.gitRepoName, accessToken);
            console.log(`Got GitLab project ID: ${gitProjectId} for ${repo.gitProjectGroup}/${repo.gitRepoName}`);
        }   

        const commit = {
            branch: change.branch,
            commit_message: change.commitMessage,
            actions: change.actions,
          };
      
          const url = `https://${repo.gitHost}/api/v4/projects/${gitProjectId}/repository/commits`;
          const result = await fetch(new URL(url), {
            method: 'POST',
            body: JSON.stringify(commit),
            headers: {
              'PRIVATE-TOKEN': accessToken,
              'Content-Type': 'application/json',
            },
          });
      
          const resultBody = await result.json();

          if (result.status > 299) {
            this.logger.error(`ERROR: Failed to submit commit to ${repo.gitRepoName}`);
            return {
                isSuccuess: false,
                message: `ERROR: Failed to submit commit to ${repo.gitRepoName}`,            
                httpResponse : result.status,
                value:resultBody.message || 'FAILURE'
                }
        } else {
            return { 
                isSuccuess: true,
                message: `Commit submitted successfully`,            
                httpResponse : result.status,
                value:resultBody
            };
        }
    }

    

}
