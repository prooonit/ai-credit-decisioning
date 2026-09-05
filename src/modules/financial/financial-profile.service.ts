import type {
  BankingProvider,
  CreditProvider,
  IdentityProvider,
  LiabilityProvider,
} from './providers.js';

export class FinancialProfileService {
  constructor(
    private readonly credit: CreditProvider,
    private readonly banking: BankingProvider,
    private readonly liabilities: LiabilityProvider,
    private readonly identity: IdentityProvider,
  ) {}
  async getProfile(customerId: string, tenantId: string) {
    const [credit, accounts, recentTransactions, liabilities, identity] = await Promise.all([
      this.credit.getCreditProfile(customerId, tenantId),
      this.banking.getBankAccounts(customerId, tenantId),
      this.banking.getRecentTransactions(customerId, tenantId),
      this.liabilities.getLiabilities(customerId, tenantId),
      this.identity.verifyIdentity(customerId, tenantId),
    ]);
    return { customerId, credit, banking: { accounts, recentTransactions }, liabilities, identity };
  }
}
