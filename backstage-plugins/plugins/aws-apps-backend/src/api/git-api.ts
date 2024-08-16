import { GitProviders, ISCMBackendAPI } from '@aws/plugin-aws-apps-common-for-backstage';
import { GitLabAPI } from './gitlab-api';
import { GitHubAPI } from './github-api';
import { LoggerService } from '@backstage/backend-plugin-api';


export class GitAPI
{
    // The main reference implementation of git
    private git: ISCMBackendAPI

    public constructor(
        readonly logger: LoggerService,
        readonly gitProvider: GitProviders
      ) {
        this.logger = logger;
        this.gitProvider = gitProvider;
        this.logger.info(`Instantiating GitAPI with ${gitProvider}...`);
        if (gitProvider === GitProviders.GITLAB) {
          this.git = new GitLabAPI(logger);
        }else if (gitProvider === GitProviders.GITHUB) {
          this.git =  new GitHubAPI(logger);
         } 
         else if (gitProvider === GitProviders.UNSET) {
          this.git =  new GitHubAPI(logger);
         } 
         else
         {
            throw new Error("Invalid / unsupported Git Provider");
         }
      }
    
    public getGitProviderType():string {
        return this.gitProvider
    }
    
    public getGitProvider():ISCMBackendAPI {
        return this.git
    }
}