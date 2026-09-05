import { Prisma } from '@prisma/client';
import { z } from 'zod';

const moneyPattern = /^\d+(?:\.\d{1,2})?$/;

export const positiveMoneySchema = z
  .string()
  .regex(moneyPattern, 'Must be a positive monetary value with at most two decimal places')
  .refine((value) => new Prisma.Decimal(value).greaterThan(0), 'Must be greater than zero');

export const toDecimal = (value: string) => new Prisma.Decimal(value);

export const formatMoney = (value: Prisma.Decimal) => value.toFixed(2);
