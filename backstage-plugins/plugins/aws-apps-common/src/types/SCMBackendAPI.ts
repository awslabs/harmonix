import { GitProviders } from "./git-providers";

export interface IGitAPIResult
{
    isSuccuess: boolean;
    message: string;
    httpResponse: number;
    value: any;
} 

export interface ICommitChange {
    actions: ICommitAction[];
    branch: string;
    commitMessage: string;
}

export interface ICommitAction
{
    action: string;
    file_path: string;
    content: string;
}

export enum GitVisibility {
    PRIVATE = "private",
    PUBIC = "public"
  }

export interface IRepositoryInfo {
    rawIdentifier?: string;
    gitHost: string;
    gitProjectGroup?: string;
    gitOrganization?: string;
    gitRepoName: string;
    gitJobID?: string;
    projectID?: string;
    description?: string;
    isPrivate: boolean;
    visibility?: GitVisibility;
    gitProvider: GitProviders;
}

// Source Control Management API
export interface ISCMBackendAPI {
    deleteRepository: (repo: IRepositoryInfo , accessToken: string) => Promise<IGitAPIResult>;
    createRepository: (repo: IRepositoryInfo, accessToken: string) =>  Promise<IGitAPIResult>;
    getFileContent: (filePath: string, repo: IRepositoryInfo, accessToken: string) =>  Promise<IGitAPIResult>;
    commitContent: (change:ICommitChange, repo: IRepositoryInfo, accessToken: string) =>  Promise<IGitAPIResult>;
}
