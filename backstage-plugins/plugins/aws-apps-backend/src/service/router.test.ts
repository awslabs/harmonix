import { mockServices } from '@backstage/backend-test-utils';
import { CatalogApi } from '@backstage/catalog-client';
import express from 'express';
import request from 'supertest';

import { createRouter } from './router';

const mockCatalog: jest.Mocked<CatalogApi> = {
  getEntityByRef: jest.fn(),
} as any as jest.Mocked<CatalogApi>;

describe('createRouter', () => {
  let app: express.Express;

  beforeAll(async () => {
    const router = await createRouter({
      logger: mockServices.logger.mock(),
      config: mockServices.rootConfig(),
      userInfo: mockServices.userInfo(),
      catalogApi: mockCatalog,
      permissions: mockServices.permissions.mock(),
      auth: mockServices.auth.mock(),
      httpAuth: mockServices.httpAuth.mock(),
    });
    app = express().use(router);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /health', () => {
    it('returns ok', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });
});
