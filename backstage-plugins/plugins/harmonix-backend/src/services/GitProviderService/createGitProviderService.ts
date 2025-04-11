import { LoggerService } from '@backstage/backend-plugin-api';
import { ISCMBackendAPI } from '@aws/plugin-aws-apps-common-for-backstage';
import { GitAPI } from '../../api/git-api';

export async function createGitProviderService({
  logger
}: {
  logger: LoggerService;
}): Promise<ISCMBackendAPI> {
  logger.info('Git Provider Service...');
  return new GitAPI(logger).getGitProvider();
}
