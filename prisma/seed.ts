import dotenv from 'dotenv';
import {
  BankAccountType,
  IdentityVerificationStatus,
  LiabilityStatus,
  LiabilityType,
  PrismaClient,
  TransactionCategory,
} from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();

const tenantId = process.env.SEED_TENANT_ID;
const customerId = process.env.SEED_CUSTOMER_ID;

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

const seed = async () => {
  // =========================================================
  // VALIDATE ENVIRONMENT
  // =========================================================

  if (!tenantId) {
    throw new Error('SEED_TENANT_ID is not configured');
  }

  if (!customerId) {
    throw new Error('SEED_CUSTOMER_ID is not configured');
  }

  if (!isUuid(tenantId)) {
    throw new Error(`Invalid SEED_TENANT_ID: ${tenantId}`);
  }

  if (!isUuid(customerId)) {
    throw new Error(`Invalid SEED_CUSTOMER_ID: ${customerId}`);
  }

  // =========================================================
  // VERIFY TENANT
  // =========================================================

  const tenant = await prisma.tenant.findUnique({
    where: {
      id: tenantId,
    },
  });

  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantId}`);
  }

  // =========================================================
  // VERIFY CUSTOMER
  // =========================================================

  const customer = await prisma.customer.findUnique({
    where: {
      id: customerId,
    },
  });

  if (!customer) {
    throw new Error(`Customer not found: ${customerId}`);
  }

  // =========================================================
  // VERIFY TENANT OWNERSHIP
  // =========================================================

  if (customer.tenantId !== tenantId) {
    throw new Error(
      `Customer ${customerId} does not belong to tenant ${tenantId}`,
    );
  }

  console.info('----------------------------------------');
  console.info('Seeding synthetic financial data');
  console.info(`Tenant: ${tenant.name}`);
  console.info(`Tenant ID: ${tenant.id}`);
  console.info(`Customer: ${customer.fullName}`);
  console.info(`Customer ID: ${customer.id}`);
  console.info('----------------------------------------');

  // =========================================================
  // CREDIT PROFILE
  // =========================================================

  await prisma.creditProfile.upsert({
    where: {
      customerId,
    },
    update: {
      tenantId,
      creditScore: 742,
      totalAccounts: 4,
      activeAccounts: 2,
      totalOutstanding: '125000.00',
      latePayments: 0,
      hardInquiries: 1,
      creditAgeMonths: 62,
    },
    create: {
      tenantId,
      customerId,
      creditScore: 742,
      totalAccounts: 4,
      activeAccounts: 2,
      totalOutstanding: '125000.00',
      latePayments: 0,
      hardInquiries: 1,
      creditAgeMonths: 62,
    },
  });

  // =========================================================
  // BANK ACCOUNT
  // =========================================================

  const bankAccountId = '00000000-0000-4000-8000-000000000002';

  const account = await prisma.bankAccount.upsert({
    where: {
      id: bankAccountId,
    },
    update: {
      tenantId,
      customerId,
      institutionName: 'Synthetic Bank',
      accountType: BankAccountType.SAVINGS,
      maskedAccountNumber: 'XXXX-1234',
      currentBalance: '185000.00',
      availableBalance: '185000.00',
      openedAt: new Date('2020-01-01'),
    },
    create: {
      id: bankAccountId,
      tenantId,
      customerId,
      institutionName: 'Synthetic Bank',
      accountType: BankAccountType.SAVINGS,
      maskedAccountNumber: 'XXXX-1234',
      currentBalance: '185000.00',
      availableBalance: '185000.00',
      openedAt: new Date('2020-01-01'),
    },
  });

  // =========================================================
  // BANK TRANSACTIONS
  // =========================================================

  const transactions = [
    {
      id: '00000000-0000-4000-8000-000000000003',
      transactionDate: new Date('2026-06-01'),
      amount: '75000.00',
      balanceAfter: '145000.00',
    },
    {
      id: '00000000-0000-4000-8000-000000000013',
      transactionDate: new Date('2026-07-01'),
      amount: '75000.00',
      balanceAfter: '165000.00',
    },
    {
      id: '00000000-0000-4000-8000-000000000023',
      transactionDate: new Date('2026-08-01'),
      amount: '75000.00',
      balanceAfter: '185000.00',
    },
  ];

  for (const transaction of transactions) {
    await prisma.bankTransaction.upsert({
      where: {
        id: transaction.id,
      },
      update: {
        tenantId,
        customerId,
        bankAccountId: account.id,
        transactionDate: transaction.transactionDate,
        type: 'CREDIT',
        amount: transaction.amount,
        category: TransactionCategory.SALARY,
        description: 'Synthetic monthly salary credit',
        balanceAfter: transaction.balanceAfter,
      },
      create: {
        id: transaction.id,
        tenantId,
        customerId,
        bankAccountId: account.id,
        transactionDate: transaction.transactionDate,
        type: 'CREDIT',
        amount: transaction.amount,
        category: TransactionCategory.SALARY,
        description: 'Synthetic monthly salary credit',
        balanceAfter: transaction.balanceAfter,
      },
    });
  }

  // =========================================================
  // LIABILITY
  // =========================================================

  await prisma.liability.upsert({
    where: {
      id: '00000000-0000-4000-8000-000000000004',
    },
    update: {
      tenantId,
      customerId,
      type: LiabilityType.PERSONAL_LOAN,
      lenderName: 'Synthetic Lender',
      originalAmount: '200000.00',
      outstandingAmount: '125000.00',
      monthlyEmi: '8500.00',
      interestRate: '12.50',
      startDate: new Date('2024-01-01'),
      status: LiabilityStatus.ACTIVE,
    },
    create: {
      id: '00000000-0000-4000-8000-000000000004',
      tenantId,
      customerId,
      type: LiabilityType.PERSONAL_LOAN,
      lenderName: 'Synthetic Lender',
      originalAmount: '200000.00',
      outstandingAmount: '125000.00',
      monthlyEmi: '8500.00',
      interestRate: '12.50',
      startDate: new Date('2024-01-01'),
      status: LiabilityStatus.ACTIVE,
    },
  });

  // =========================================================
  // IDENTITY VERIFICATION
  // =========================================================

  await prisma.identityVerification.upsert({
    where: {
      id: '00000000-0000-4000-8000-000000000005',
    },
    update: {
      tenantId,
      customerId,
      status: IdentityVerificationStatus.VERIFIED,
      provider: 'Synthetic Identity Provider',
      reference: 'SYNTH-VERIFY-001',
      verifiedAt: new Date('2026-01-01'),
    },
    create: {
      id: '00000000-0000-4000-8000-000000000005',
      tenantId,
      customerId,
      status: IdentityVerificationStatus.VERIFIED,
      provider: 'Synthetic Identity Provider',
      reference: 'SYNTH-VERIFY-001',
      verifiedAt: new Date('2026-01-01'),
    },
  });

  // =========================================================
  // SUCCESS
  // =========================================================

  console.info('----------------------------------------');
  console.info('Synthetic financial data seeded successfully');
  console.info(`Tenant: ${tenant.name}`);
  console.info(`Tenant ID: ${tenant.id}`);
  console.info(`Customer: ${customer.fullName}`);
  console.info(`Customer ID: ${customer.id}`);
  console.info('');
  console.info('Seeded:');
  console.info('- Credit profile');
  console.info('- Bank account');
  console.info('- 3 months of salary transactions');
  console.info('- Liability');
  console.info('- Identity verification');
  console.info('----------------------------------------');
};

seed()
  .catch((error: unknown) => {
    console.error('Synthetic financial seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });