import dotenv from 'dotenv';

import {
  BankAccountType,
  EmploymentType,
  IdentityVerificationStatus,
  LiabilityStatus,
  LiabilityType,
  LoanType,
  PrismaClient,
  TenantStatus,
  TransactionCategory,
  UserRole,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

dotenv.config();

const prisma = new PrismaClient();

const seed = async () => {
  // =========================================================
  // TENANT
  // =========================================================

  const tenant = await prisma.tenant.upsert({
    where: {
      slug: process.env.SEED_TENANT_SLUG ?? 'development',
    },
    update: {
      name: process.env.SEED_TENANT_NAME ?? 'Development Tenant',
      status: TenantStatus.ACTIVE,
    },
    create: {
      name: process.env.SEED_TENANT_NAME ?? 'Development Tenant',
      slug: process.env.SEED_TENANT_SLUG ?? 'development',
      status: TenantStatus.ACTIVE,
    },
  });

  // =========================================================
  // ADMIN USER
  // =========================================================

  const email =
    process.env.SEED_ADMIN_EMAIL ?? 'admin@example.test';

  const password =
    process.env.SEED_ADMIN_PASSWORD ?? 'change-me-in-development';

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: process.env.SEED_ADMIN_NAME ?? 'Development Admin',
      passwordHash: await bcrypt.hash(password, 12),
    },
    create: {
      email,
      name: process.env.SEED_ADMIN_NAME ?? 'Development Admin',
      passwordHash: await bcrypt.hash(password, 12),
    },
  });

  // =========================================================
  // TENANT MEMBERSHIP
  // =========================================================

  await prisma.userTenantMembership.upsert({
    where: {
      userId_tenantId: {
        userId: user.id,
        tenantId: tenant.id,
      },
    },
    update: {
      role: UserRole.OWNER,
    },
    create: {
      userId: user.id,
      tenantId: tenant.id,
      role: UserRole.OWNER,
    },
  });

  // =========================================================
  // FIND EXISTING CUSTOMER
  // =========================================================

  const customerExternalReference =
    process.env.SEED_CUSTOMER_EXTERNAL_REFERENCE ??
    'CUSTOMER-001';

  const customer = await prisma.customer.findFirst({
    where: {
      tenantId: tenant.id,
      externalReference: customerExternalReference,
    },
  });

  if (!customer) {
    throw new Error(
      `Customer with externalReference "${customerExternalReference}" was not found for tenant "${tenant.slug}". ` +
        `Create the customer first using the API or set the correct SEED_TENANT_SLUG.`,
    );
  }

  console.info(
    `Using existing customer: ${customer.fullName} (${customer.id})`,
  );

  // =========================================================
  // LOAN APPLICATION
  // =========================================================

  await prisma.loanApplication.upsert({
    where: {
      id: '00000000-0000-4000-8000-000000000001',
    },
    update: {
      tenantId: tenant.id,
      customerId: customer.id,
    },
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      tenantId: tenant.id,
      customerId: customer.id,
      loanType: LoanType.PERSONAL,
      requestedAmount: '250000.00',
    },
  });

  // =========================================================
  // CREDIT PROFILE
  // =========================================================

  await prisma.creditProfile.upsert({
    where: {
      customerId: customer.id,
    },
    update: {
      tenantId: tenant.id,
      creditScore: 742,
      totalAccounts: 4,
      activeAccounts: 2,
      totalOutstanding: '125000.00',
      latePayments: 0,
      hardInquiries: 1,
      creditAgeMonths: 62,
    },
    create: {
      tenantId: tenant.id,
      customerId: customer.id,
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

  const account = await prisma.bankAccount.upsert({
    where: {
      id: '00000000-0000-4000-8000-000000000002',
    },
    update: {
      tenantId: tenant.id,
      customerId: customer.id,
      institutionName: 'Synthetic Bank',
      accountType: BankAccountType.SAVINGS,
      maskedAccountNumber: 'XXXX-1234',
      currentBalance: '185000.00',
      availableBalance: '185000.00',
      openedAt: new Date('2020-01-01'),
    },
    create: {
      id: '00000000-0000-4000-8000-000000000002',
      tenantId: tenant.id,
      customerId: customer.id,
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

  await prisma.bankTransaction.upsert({
    where: {
      id: '00000000-0000-4000-8000-000000000003',
    },
    update: {
      tenantId: tenant.id,
      customerId: customer.id,
      bankAccountId: account.id,
      transactionDate: new Date('2026-08-01'),
      type: 'CREDIT',
      amount: '75000.00',
      category: TransactionCategory.SALARY,
      description: 'Synthetic salary credit',
      balanceAfter: '185000.00',
    },
    create: {
      id: '00000000-0000-4000-8000-000000000003',
      tenantId: tenant.id,
      customerId: customer.id,
      bankAccountId: account.id,
      transactionDate: new Date('2026-08-01'),
      type: 'CREDIT',
      amount: '75000.00',
      category: TransactionCategory.SALARY,
      description: 'Synthetic salary credit',
      balanceAfter: '185000.00',
    },
  });

  // =========================================================
  // LIABILITY
  // =========================================================

  await prisma.liability.upsert({
    where: {
      id: '00000000-0000-4000-8000-000000000004',
    },
    update: {
      tenantId: tenant.id,
      customerId: customer.id,
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
      tenantId: tenant.id,
      customerId: customer.id,
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
      tenantId: tenant.id,
      customerId: customer.id,
      status: IdentityVerificationStatus.VERIFIED,
      provider: 'Synthetic Identity Provider',
      reference: 'SYNTH-VERIFY-001',
      verifiedAt: new Date('2026-01-01'),
    },
    create: {
      id: '00000000-0000-4000-8000-000000000005',
      tenantId: tenant.id,
      customerId: customer.id,
      status: IdentityVerificationStatus.VERIFIED,
      provider: 'Synthetic Identity Provider',
      reference: 'SYNTH-VERIFY-001',
      verifiedAt: new Date('2026-01-01'),
    },
  });

  console.info('----------------------------------------');
  console.info(`Tenant: ${tenant.name}`);
  console.info(`Tenant ID: ${tenant.id}`);
  console.info(`Customer: ${customer.fullName}`);
  console.info(`Customer ID: ${customer.id}`);
  console.info('Financial data seeded successfully');
  console.info('----------------------------------------');
};

seed()
  .catch((error: unknown) => {
    console.error('Development seed failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });