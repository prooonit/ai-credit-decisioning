import { EmploymentType } from '@prisma/client';
import { z } from 'zod';

import { positiveMoneySchema } from '../../lib/money.js';

export const customerCreateSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  dateOfBirth: z.coerce
    .date()
    .refine((value) => value <= new Date(), 'Date of birth cannot be in the future'),
  employmentType: z.nativeEnum(EmploymentType),
  monthlyIncome: positiveMoneySchema,
  externalReference: z.string().trim().min(1).max(100).optional(),
});

export const customerListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const customerParamsSchema = z.object({ id: z.string().uuid() });
