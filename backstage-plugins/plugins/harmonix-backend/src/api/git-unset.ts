import { GitProviders } from "@aws/plugin-aws-apps-common-for-backstage";
import { IGitAPIResult, ICommitChange, IRepositoryInfo, ISCMBackendAPI } from "@aws/plugin-aws-apps-common-for-backstage/src/types/SCMBackendAPI";
import { LoggerService } from "@backstage/backend-plugin-api/*";

export class GitUnset implements ISCMBackendAPI {
   private _gitProvider: GitProviders;

    public get gitProvider(): GitProviders {
        return this._gitProvider;
      }

    setGitProvider(provider: GitProviders): void {
        this._gitProvider = provider;
    }

    public constructor(
      private readonly logger: LoggerService
      ) {
        this.logger.info('Instantiating GitHubAPI...');
        this._gitProvider = GitProviders.UNSET;
      }
 

    public async deleteRepository(repo: IRepositoryInfo, accessToken: string) :  Promise<IGitAPIResult> {
        this.logger.info(Object.values(repo).join(" "));
        this.logger.info(accessToken);
        throw Error("Unset Git Implementation")
    }
     public async createRepository(repo: IRepositoryInfo, accessToken: string): Promise<IGitAPIResult> {
      this.logger.info(Object.values(repo).join(" "));
        this.logger.info(accessToken);
        throw Error("Unset Git Implementation")
     }

     public async getFileContent(filePath: string, repo: IRepositoryInfo, accessToken: string): Promise<IGitAPIResult> {
      this.logger.info(Object.values(repo).join(" "));
        this.logger.info(filePath);
        this.logger.info(accessToken);
        throw Error("Unset Git Implementation")
       
     }
     public async commitContent(change: ICommitChange, repo: IRepositoryInfo, accessToken: string): Promise<IGitAPIResult> {
      this.logger.info(Object.values(repo).join(" "));
        this.logger.info(Object.values(change).join(" "));
        this.logger.info(accessToken);
        throw Error("Unset Git Implementation")
     }

}