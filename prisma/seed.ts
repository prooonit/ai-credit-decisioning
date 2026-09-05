import dotenv from 'dotenv';

import { PrismaClient, TenantStatus, UserRole } from '@prisma/client';
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
    update: { role: UserRole.ADMIN },
    create: { userId: user.id, tenantId: tenant.id, role: UserRole.ADMIN },
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
