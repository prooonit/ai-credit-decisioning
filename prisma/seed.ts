import dotenv from 'dotenv';

import { EmploymentType, LoanType, PrismaClient, TenantStatus, UserRole } from '@prisma/client';
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
