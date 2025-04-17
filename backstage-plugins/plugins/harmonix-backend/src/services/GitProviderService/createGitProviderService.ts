import { LoggerService } from '@backstage/backend-plugin-api';
import { IGitService } from '../definition/IGitService';
import { GitService } from '../../api/gitService';

export async function createGitProviderService({
  logger
}: {
  logger: LoggerService;
}): Promise<IGitService> {
  logger.info('Git Provider Service...');
  return new GitService(logger);
}
