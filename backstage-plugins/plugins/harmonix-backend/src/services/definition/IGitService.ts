import { GitProviders, ISCMBackendAPI } from "@aws/plugin-aws-apps-common-for-backstage";

export interface IGitService {
    gitProvider: GitProviders;
    setGitProvider(provider: GitProviders): void;
    gitProviderImpl: ISCMBackendAPI;
    setGitProviderImpl(provider: ISCMBackendAPI): void;
}