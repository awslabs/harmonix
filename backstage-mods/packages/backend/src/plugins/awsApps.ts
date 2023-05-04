//awsApps.ts

import {createRouter} from '@aws/plugin-aws-apps-backend-for-backstage'
import { Router } from 'express';
import { PluginEnvironment } from '../types';

export default async function createPlugin(env: PluginEnvironment): Promise<Router> {
  return await createRouter({
    logger: env.logger,
    userIdentity: env.identity,
  });
}