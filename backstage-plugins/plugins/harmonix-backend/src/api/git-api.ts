import { GitProviders, ISCMBackendAPI } from '@aws/plugin-aws-apps-common-for-backstage';
import { GitLabAPI } from './gitlab-api';
import { GitHubAPI } from './github-api';
import { LoggerService } from '@backstage/backend-plugin-api';
import { GitUnset } from './git-unset';


export class GitAPI
{
    // The main reference implementation of git
    private _git: ISCMBackendAPI
    private _gitProvider: GitProviders;

    public constructor(
        readonly logger: LoggerService,
        gitProvider?: GitProviders
      ) {
        this.logger = logger;
        this._gitProvider = gitProvider || GitProviders.UNSET;
        this._git = new GitUnset(logger);
        this.instatiateGitProvider();
      }

    private instatiateGitProvider() {
      this.logger.info(`Instantiating GitAPI with ${this._gitProvider}...`);
      if (this._gitProvider === GitProviders.GITLAB) {
        this._git = new GitLabAPI(this.logger);
      }else if (this._gitProvider === GitProviders.GITHUB) {
        this._git =  new GitHubAPI(this.logger);
       } 
       else if (this._gitProvider === GitProviders.UNSET) {
        this._git =  new GitHubAPI(this.logger);
       } 
       else
       {
          throw new Error("Invalid / unsupported Git Provider");
       }
    }

    public get git(): ISCMBackendAPI {
      return this._git
    }

    public get gitProvider():GitProviders {
        return this._gitProvider
    }

    public setGitProvider(provider: GitProviders): void {
      this._gitProvider = provider;
      this.instatiateGitProvider();
    }

    public getGitProvider():ISCMBackendAPI {
        return this.git
    }
}