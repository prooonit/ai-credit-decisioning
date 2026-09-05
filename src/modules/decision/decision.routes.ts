import { UserRole, type PrismaClient } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { formatMoney } from '../../lib/money.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/require-role.js';
import { createTenantContext } from '../../middleware/tenant-context.js';
import { getValidated, validateRequest } from '../../middleware/validate-request.js';
import { CreditDecisionService } from './decision.service.js';

const paramsSchema = z.object({ applicationId: z.string().uuid() });
export const createDecisionRouter = (prisma: PrismaClient) => {
  const router = Router();
  const service = new CreditDecisionService(prisma);
  router.use(authenticate, createTenantContext(prisma));
  router.post('/:applicationId/evaluate', requireRole(UserRole.OWNER, UserRole.ADMIN, UserRole.ANALYST), validateRequest(paramsSchema, 'params'), async (req, res, next) => {
    try {
      const { applicationId } = getValidated<z.infer<typeof paramsSchema>>(req, 'params');
      const result = await service.evaluate(req.tenantContext!, applicationId);
      res.status(200).json({
        application: { id: result.application.id, status: result.application.status, requestedAmount: formatMoney(result.application.requestedAmount) },
        decision: { id: result.decision.id, decision: result.decision.decision, policyVersion: result.decision.policyVersion, reasons: result.decision.ruleResults },
      });
    } catch (error) { next(error); }
  });
  return router;
};
