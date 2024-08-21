// // Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// // SPDX-License-Identifier: Apache-2.0

// import { HostDiscovery, ServerTokenManager, createServiceBuilder, loadBackendConfig } from '@backstage/backend-common';
// import { ServerPermissionClient } from '@backstage/plugin-permission-node';
// import { Server } from 'http';
// import { Logger } from 'winston';
// import { createRouter } from './router';

// export interface ServerOptions {
//   port: number;
//   enableCors: boolean;
//   logger: Logger;
// }

// export async function startStandaloneServer(options: ServerOptions): Promise<Server> {
//   const logger = options.logger.child({ service: 'aws-apps-backend' });
//   logger.debug('Starting application server...');
//   const config = await loadBackendConfig({ logger, argv: process.argv });
//   const discovery = HostDiscovery.fromConfig(config);
//   const tokenManager = ServerTokenManager.fromConfig(config, {
//     logger,
//   });
//   const permissions = ServerPermissionClient.fromConfig(config, {
//     discovery,
//     tokenManager,
//   });
//   const router = await createRouter({
//     logger,
//     userInfo,
//     config,
//     permissions,
//   });

//   let service = createServiceBuilder(module).setPort(options.port).addRouter('/aws-apps-backend', router);
//   if (options.enableCors) {
//     service = service.enableCors({ origin: 'http://localhost:3000' });
//   }

//   return await service.start().catch(err => {
//     logger.error(err);
//     process.exit(1);
//   });
// }

// module.hot?.accept();
