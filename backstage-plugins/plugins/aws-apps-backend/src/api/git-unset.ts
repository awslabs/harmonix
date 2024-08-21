import { IGitAPIResult, ICommitChange, IRepositoryInfo, ISCMBackendAPI } from "@aws/plugin-aws-apps-common-for-backstage/src/types/SCMBackendAPI";
import { Logger } from 'winston';


export class GitUnset implements ISCMBackendAPI {
    public constructor(
        private readonly logger: Logger
      ) {
        this.logger.info('Instantiating GitHubAPI...');
      }

    public async deleteRepository(repo: IRepositoryInfo, accessToken: string) :  Promise<IGitAPIResult> {
        this.logger.info(repo);
        this.logger.info(accessToken==="");
        throw Error("Unset Git Implementation")
    }
     public async createRepository(repo: IRepositoryInfo, accessToken: string): Promise<IGitAPIResult> {
        this.logger.info(repo);
        this.logger.info(accessToken==="");
        throw Error("Unset Git Implementation")
     }

     public async getFileContent(filePath: string, repo: IRepositoryInfo, accessToken: string): Promise<IGitAPIResult> {
        this.logger.info(repo);
        this.logger.info(filePath);
        this.logger.info(accessToken==="");
        throw Error("Unset Git Implementation")
       
     }
     public async commitContent(change: ICommitChange, repo: IRepositoryInfo, accessToken: string): Promise<IGitAPIResult> {
        this.logger.info(repo);
        this.logger.info(change);
        this.logger.info(accessToken==="");
        throw Error("Unset Git Implementation")
     }

}