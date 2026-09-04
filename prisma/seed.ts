import { scryptSync } from 'node:crypto';

import dotenv from 'dotenv';

import { PrismaClient, TenantStatus, UserRole } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();

const developmentPasswordHash = (password: string) =>
  `scrypt$development-only-salt$${scryptSync(password, 'development-only-salt', 64).toString('hex')}`;

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
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email } },
    update: {
      name: process.env.SEED_ADMIN_NAME ?? 'Development Admin',
      role: UserRole.ADMIN,
      passwordHash: developmentPasswordHash(
        process.env.SEED_ADMIN_PASSWORD ?? 'change-me-in-development',
      ),
    },
    create: {
      tenantId: tenant.id,
      email,
      name: process.env.SEED_ADMIN_NAME ?? 'Development Admin',
      role: UserRole.ADMIN,
      passwordHash: developmentPasswordHash(
        process.env.SEED_ADMIN_PASSWORD ?? 'change-me-in-development',
      ),
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
