import { GitProviders } from './git-providers';

/** @public */
export interface IGitAPIResult {
  isSuccess: boolean;
  message: string;
  httpResponse: number;
  value: any;
}

/** @public */
export interface ICommitChange {
  actions: ICommitAction[];
  branch: string;
  commitMessage: string;
}

/** @public */
export interface ICommitAction {
  action: string;
  file_path: string;
  content: string;
}

/** @public */
export enum GitVisibility {
  PRIVATE = 'private',
  PUBIC = 'public',
}

/** @public */
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
/** @public */
export interface ISCMBackendAPI {
  deleteRepository: (repo: IRepositoryInfo, accessToken: string) => Promise<IGitAPIResult>;
  createRepository: (repo: IRepositoryInfo, accessToken: string) => Promise<IGitAPIResult>;
  getFileContent: (filePath: string, repo: IRepositoryInfo, accessToken: string) => Promise<IGitAPIResult>;
  commitContent: (change: ICommitChange, repo: IRepositoryInfo, accessToken: string) => Promise<IGitAPIResult>;
}
