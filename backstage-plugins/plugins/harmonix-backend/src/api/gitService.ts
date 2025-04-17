import { GitProviders, ISCMBackendAPI } from "@aws/plugin-aws-apps-common-for-backstage";
import { IGitService } from "../services/definition/IGitService";
import { LoggerService } from "@backstage/backend-plugin-api";
import { GitLabAPI } from "./gitlab-api";
import { GitHubAPI } from "./github-api";
import { GitUnset } from "./git-unset";

export class GitService implements IGitService{
    private _gitProvider: GitProviders;
    private _gitProviderImpl: ISCMBackendAPI;

    public constructor(
        private readonly logger: LoggerService 
    )
    {
        this.logger.info('Instantiating GitService');
    }

    public get gitProvider(): GitProviders {
        return this._gitProvider;
      }
    
    public get gitProviderImpl(): ISCMBackendAPI {
        return this._gitProviderImpl;
      }

    setGitProvider(provider: GitProviders): void {
      this._gitProvider = provider;
      this.instatiateGitProvider();
    }
    setGitProviderImpl(provider: ISCMBackendAPI): void {
      this._gitProviderImpl = provider;
    }

     private instatiateGitProvider() {
        this.logger.info(`Instantiating GitService with ${this._gitProvider}...`);
        if (this._gitProvider === GitProviders.GITLAB) {
          this._gitProviderImpl = new GitLabAPI(this.logger);
        }
        else if (this._gitProvider === GitProviders.GITHUB) {
          this._gitProviderImpl =  new GitHubAPI(this.logger);
        } 
        else if (this._gitProvider === GitProviders.UNSET) {
          this._gitProviderImpl =  new GitUnset(this.logger);
        } 
        else
        {
          throw new Error("Invalid / unsupported Git Provider");
        }
      } 
}



  