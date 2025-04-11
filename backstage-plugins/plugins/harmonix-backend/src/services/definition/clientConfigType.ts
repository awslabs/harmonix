import { IAWSSDKService } from "./IAWSSDKService";

export type ApiClientConfig = {
    apiClient: IAWSSDKService;
    roleArn: string;
    awsAccount: string;
    awsRegion: string;
    prefix: string;
    providerName: string;
    appName: string;
    requester: string;
    owner: string;
  };
  