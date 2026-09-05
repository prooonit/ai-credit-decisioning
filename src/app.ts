import express from 'express';
import type { PrismaClient } from '@prisma/client';

import { prisma as defaultPrisma } from './lib/prisma.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { createAuthRouter } from './routes/auth.routes.js';
import { createApplicationRouter } from './modules/applications/application.routes.js';
import { createDecisionRouter } from './modules/decision/decision.routes.js';
import { createCustomerRouter } from './modules/customers/customer.routes.js';
import { createFinancialRouter } from './modules/financial/financial.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { createMeRouter } from './routes/me.routes.js';
import { createTenantRouter } from './routes/tenant.routes.js';

export const createApp = (dependencies: { prisma?: PrismaClient } = {}) => {
  const prisma = dependencies.prisma ?? defaultPrisma;
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use('/health', healthRouter);
  app.use('/api/v1/auth', createAuthRouter(prisma));
  app.use('/api/v1/me', createMeRouter(prisma));
  app.use('/api/v1/tenants', createTenantRouter(prisma));
  app.use('/api/v1/customers', createCustomerRouter(prisma));
  app.use('/api/v1/customers', createFinancialRouter(prisma));
  app.use('/api/v1/applications', createApplicationRouter(prisma));
  app.use('/api/v1/applications', createDecisionRouter(prisma));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
