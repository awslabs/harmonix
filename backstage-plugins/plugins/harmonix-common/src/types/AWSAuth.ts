import { AwsCredentialIdentity } from '@aws-sdk/types';

export interface AwsAuthResponse {
  credentials: AwsCredentialIdentity;
  requester: string;
  owner?: string;
  roleArn: string;
  account: string;
  region: string;
}