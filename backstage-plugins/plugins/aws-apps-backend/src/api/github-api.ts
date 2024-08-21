import { IGitAPIResult, ICommitChange, IRepositoryInfo, ISCMBackendAPI } from "@aws/plugin-aws-apps-common-for-backstage/src/types/SCMBackendAPI";
import { Octokit } from "octokit";
import { Buffer } from "buffer";
import { LoggerService } from "@backstage/backend-plugin-api";


export class GitHubAPI implements ISCMBackendAPI {
    public constructor(
        private readonly logger: LoggerService
      ) {
        this.logger.info('Instantiating GitHubAPI...');
      }

    public async createRepository(repo: IRepositoryInfo, accessToken: string): Promise<IGitAPIResult> {
        const octokit = new Octokit({ auth: accessToken });
        const url = `https://${repo.gitHost}`;
        console.log(url);
        
        const createRepoResults = await octokit.rest.repos.createInOrg({
                org: repo.gitOrganization || "",
                name:repo.gitRepoName,
                description: repo.description || "",
                private: repo.isPrivate,
                visibility: repo.visibility || "private",
                auto_init: true 
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
        const octokit = new Octokit({ auth: accessToken });
        const url = `https://${repo.gitHost}`;
        console.log(url);
        
        const deleteRepoResults = await octokit.rest.repos.delete({
                owner: repo.gitOrganization || "",
                repo:repo.gitRepoName,
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
        const octokit = new Octokit({ auth: accessToken });
        // console.log(repo.gitRepoName)
        // console.log(repo.gitOrganization)
        console.log(filePath)
        const result = await octokit.rest.repos.getContent({
                owner: repo.gitOrganization || "",
                repo:repo.gitRepoName,
                path: filePath
        });
       
        if (result.status > 299) {
            this.logger.error(`ERROR: Failed to retrieve ${filePath} for ${repo.gitRepoName}. Response code: ${result.status} - ${result}`);
            return {
                isSuccuess: false,
                message: `ERROR: Failed to retrieve ${filePath} for ${repo.gitRepoName}. Response code: ${result.status} - ${result}`,            
                httpResponse : result.status,
                value:'FAILURE'
                }
        } else {
            // console.log(result.data)
            // console.log(result.data.content)
            // const fileDataProcessed = Buffer.from(result.data.content, 'base64').toString('binary')
            const dataContent = result.data;
            //console.log(dataContent)
            const contentB64 = dataContent as any;     //cast internal type base 64 string  
            //console.log(contentB64.content)
            const content = Buffer.from(contentB64.content, 'base64').toString()
            
            return { 
                isSuccuess: true,
                message: `Retrieve file content successfully`,            
                httpResponse : result.status,
                value:content
            };
        }
    }

    public async commitContent(change: ICommitChange, repo: IRepositoryInfo, accessToken: string): Promise<IGitAPIResult> {
        const octokitPlugin = Octokit.plugin(require("octokit-commit-multiple-files"));
        const octokit = new octokitPlugin({ auth: accessToken });
       
        const url = `https://${repo.gitHost}`;
        console.log(url);
       try {
        // supported actions = "deletions" , "additions"
        // prepare content
        
            const changes = change.actions.map( item=> {
                return {
                    message: change.commitMessage,
                    files: {
                        [item.file_path] : Buffer.from(item.content).toString('base64'),
                    }
                }
            })
            

            const result = await octokit.createOrUpdateFiles({
                owner: repo.gitOrganization || "",
                repo:repo.gitRepoName,
                branch : change.branch,
                createBranch: false,
                changes
            });


        console.log(result)
     
        return { 
            isSuccuess: true,
            message: `Commit submitted successfully`,            
            httpResponse : 200,
            value:result
        };

       } catch (error) {
            this.logger.error(`ERROR: Failed to submit commit to ${repo.gitRepoName}`);
            this.logger.error(JSON.stringify(error));
            return {
                isSuccuess: false,
                message: `ERROR: Failed to submit commit to ${repo.gitRepoName}`,            
                httpResponse : 500,
                value:error || 'FAILURE'
                }
       }
    }
}