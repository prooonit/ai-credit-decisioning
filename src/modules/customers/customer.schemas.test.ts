import { describe, expect, it } from 'vitest';

import { customerCreateSchema, customerListSchema } from './customer.schemas.js';

describe('customer validation', () => {
  const validCustomer = {
    fullName: 'Sample Borrower',
    dateOfBirth: '1990-01-15',
    employmentType: 'SALARIED',
    monthlyIncome: '75000.00',
  };

  it('accepts a valid customer and bounded pagination', () => {
    expect(customerCreateSchema.safeParse(validCustomer).success).toBe(true);
    expect(customerListSchema.parse({ page: '2', pageSize: '20' })).toEqual({
      page: 2,
      pageSize: 20,
    });
  });

  it.each(['0', '-1.00', '12.345', 'NaN', 'Infinity', '1e4'])(
    'rejects invalid money: %s',
    (monthlyIncome) => {
      expect(customerCreateSchema.safeParse({ ...validCustomer, monthlyIncome }).success).toBe(
        false,
      );
    },
  );

  it('rejects dates in the future and pages larger than 100', () => {
    expect(
      customerCreateSchema.safeParse({ ...validCustomer, dateOfBirth: '2999-01-01' }).success,
    ).toBe(false);
    expect(customerListSchema.safeParse({ page: 1, pageSize: 101 }).success).toBe(false);
  });
});
