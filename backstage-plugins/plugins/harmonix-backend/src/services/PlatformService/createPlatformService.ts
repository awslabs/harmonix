import { LoggerService } from '@backstage/backend-plugin-api';
import { IAppsPlatformService } from '../definition/IAppsPlatformService';
import { AppsPlatformService } from '../../api/aws-platform';

export async function createAppsPlatformService({
  logger
}: {
  logger: LoggerService;
}): Promise<IAppsPlatformService> {
  logger.info('Apps Platform Service...');
  return new AppsPlatformService(logger);
}
