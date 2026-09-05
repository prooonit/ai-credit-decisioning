import { describe, expect, it, vi } from 'vitest';

import { FinancialProfileService } from './financial-profile.service.js';

describe('FinancialProfileService', () => {
  it('combines provider contracts without directly depending on Prisma', async () => {
    const credit = {
      getCreditProfile: vi
        .fn()
        .mockResolvedValue({ creditScore: 742, totalOutstanding: '125000.00', latePayments: 0 }),
    };
    const banking = {
      getBankAccounts: vi.fn().mockResolvedValue([]),
      getRecentTransactions: vi.fn().mockResolvedValue([]),
    };
    const liabilities = { getLiabilities: vi.fn().mockResolvedValue([]) };
    const identity = { verifyIdentity: vi.fn().mockResolvedValue(null) };
    const service = new FinancialProfileService(credit, banking, liabilities, identity);

    await expect(service.getProfile('customer-a', 'tenant-a')).resolves.toEqual({
      customerId: 'customer-a',
      credit: { creditScore: 742, totalOutstanding: '125000.00', latePayments: 0 },
      banking: { accounts: [], recentTransactions: [] },
      liabilities: [],
      identity: null,
    });
    expect(credit.getCreditProfile).toHaveBeenCalledWith('customer-a', 'tenant-a');
  });
});
