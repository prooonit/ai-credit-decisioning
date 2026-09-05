import { ApplicationStatus, LoanType } from '@prisma/client';
import { z } from 'zod';

import { positiveMoneySchema } from '../../lib/money.js';

export const applicationCreateSchema = z.object({
  customerId: z.string().uuid(),
  loanType: z.nativeEnum(LoanType),
  requestedAmount: positiveMoneySchema,
});

export const applicationListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(ApplicationStatus).optional(),
});

export const applicationParamsSchema = z.object({ id: z.string().uuid() });
