import { DeleteSecretCommandOutput, GetSecretValueCommandOutput } from "@aws-sdk/client-secrets-manager";
import { GetParameterCommandOutput } from "@aws-sdk/client-ssm";
import { AppPromoParams, AWSEnvironmentProviderRecord, BindResourceParams, IGitAPIResult, IRepositoryInfo, ISCMBackendAPI } from "@aws/plugin-aws-apps-common-for-backstage";

export interface IAppsPlatformService {

    readonly awsRegion: string;
    readonly platformRegion: string;
    readonly awsAccount: string;
    readonly gitProviderService: ISCMBackendAPI;

    setGitProviderService(provider: ISCMBackendAPI): void;
    setAwsRegion(region: string): void;
    setPlatformRegion(region: string): void;
    setAwsAccount(account: string): void;

    getPlatformSecretValue(secretArn: string): Promise<GetSecretValueCommandOutput>;
    getSsmValue(ssmKey: string): Promise<GetParameterCommandOutput>;
    deletePlatformSecret(secretName: string): Promise<DeleteSecretCommandOutput>;
    deleteTFProvider(envName: string, providerName: string, repo: IRepositoryInfo, gitSecretName: string): Promise<{ status: string; message?: string }>;
    deleteRepository(repo: IRepositoryInfo, gitSecretName: string): Promise<IGitAPIResult>;
    getGitToken(gitSecretName: string): Promise<string>;
    getFileContentsFromGit(repo: IRepositoryInfo, filePath: string, gitSecretName: string): Promise<string>;
    promoteAppToGit(input: AppPromoParams, repo: IRepositoryInfo, gitSecretName: string): Promise<{ status: string; message?: string }>;
    bindResource(repo: IRepositoryInfo, input: BindResourceParams, gitSecretName: string): Promise<{ status: string; message?: string }>;
    unBindResource(repo: IRepositoryInfo, input: BindResourceParams, gitSecretName: string): Promise<{ status: string; message?: string }>;
    updateProvider(envName: string, provider: AWSEnvironmentProviderRecord, repo: IRepositoryInfo, entityCatalog: any, action: string, gitSecretName: string): Promise<{ status: string; message?: string }>;
    
}