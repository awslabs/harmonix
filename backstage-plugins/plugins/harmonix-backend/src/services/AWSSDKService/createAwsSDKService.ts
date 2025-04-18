import { LoggerService } from '@backstage/backend-plugin-api';
import { AWSSDKService } from '../../api/AwsAppsApi';
import { IAWSSDKService } from '../definition';

export async function createAwsSDKService({
  logger
}: {
  logger: LoggerService;
}): Promise<IAWSSDKService> {
  logger.info('AWS SDK Service...');
  return new AWSSDKService(logger);
}
