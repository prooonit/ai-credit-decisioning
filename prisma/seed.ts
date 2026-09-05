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
  const tenant = await prisma.tenant.upsert({
    where: { slug: process.env.SEED_TENANT_SLUG ?? 'development' },
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

  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.test';
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: process.env.SEED_ADMIN_NAME ?? 'Development Admin',
      passwordHash: await bcrypt.hash(
        process.env.SEED_ADMIN_PASSWORD ?? 'change-me-in-development',
        12,
      ),
    },
    create: {
      email,
      name: process.env.SEED_ADMIN_NAME ?? 'Development Admin',
      passwordHash: await bcrypt.hash(
        process.env.SEED_ADMIN_PASSWORD ?? 'change-me-in-development',
        12,
      ),
    },
  });

  await prisma.userTenantMembership.upsert({
    where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
    update: { role: UserRole.OWNER },
    create: { userId: user.id, tenantId: tenant.id, role: UserRole.OWNER },
  });

  const customer = await prisma.customer.upsert({
    where: {
      tenantId_externalReference: {
        tenantId: tenant.id,
        externalReference: 'SYNTHETIC-CUSTOMER-001',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      externalReference: 'SYNTHETIC-CUSTOMER-001',
      fullName: 'Sample Borrower',
      dateOfBirth: new Date('1990-01-15T00:00:00.000Z'),
      employmentType: EmploymentType.SALARIED,
      monthlyIncome: '75000.00',
    },
  });

  await prisma.loanApplication.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      tenantId: tenant.id,
      customerId: customer.id,
      loanType: LoanType.PERSONAL,
      requestedAmount: '250000.00',
    },
  });

  await prisma.creditProfile.upsert({
    where: { customerId: customer.id },
    update: {},
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
  const account = await prisma.bankAccount.upsert({
    where: { id: '00000000-0000-4000-8000-000000000002' },
    update: {},
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
  await prisma.bankTransaction.upsert({
    where: { id: '00000000-0000-4000-8000-000000000003' },
    update: {},
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
  await prisma.liability.upsert({
    where: { id: '00000000-0000-4000-8000-000000000004' },
    update: {},
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
  await prisma.identityVerification.upsert({
    where: { id: '00000000-0000-4000-8000-000000000005' },
    update: {},
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

  console.info(`Seeded development tenant: ${tenant.slug}`);
};

seed()
  .catch((error: unknown) => {
    console.error('Development seed failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
