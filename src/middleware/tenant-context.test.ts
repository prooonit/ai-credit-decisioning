import type { PrismaClient, UserRole } from '@prisma/client';
import express from 'express';
import { decodeJwt } from 'jose';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { signAccessToken } from '../auth/jwt.js';
import { errorHandler } from './error-handler.js';
import { authenticate } from './authenticate.js';
import { requireRole } from './require-role.js';
import { createTenantContext } from './tenant-context.js';

const userId = '11111111-1111-4111-8111-111111111111';
const otherUserId = '22222222-2222-4222-8222-222222222222';
const tenantA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const tenantB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const tenantC = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

type Membership = { id: string; userId: string; tenantId: string; role: UserRole };

const memberships: Membership[] = [
  { id: 'membership-a', userId, tenantId: tenantA, role: 'ADMIN' },
  { id: 'membership-b', userId, tenantId: tenantB, role: 'ANALYST' },
  { id: 'membership-other', userId: otherUserId, tenantId: tenantC, role: 'ADMIN' },
];

const createTestApp = (requiredRole?: UserRole) => {
  const findUnique = vi.fn(async ({ where }: { where: { userId_tenantId: Membership } }) => {
    const requested = where.userId_tenantId;
    return (
      memberships.find(
        (membership) =>
          membership.userId === requested.userId && membership.tenantId === requested.tenantId,
      ) ?? null
    );
  });
  const prisma = { userTenantMembership: { findUnique } } as unknown as PrismaClient;
  const app = express();
  app.use(authenticate);
  app.use(createTenantContext(prisma));
  if (requiredRole) app.use(requireRole(requiredRole));
  app.get('/context', (req, res) => res.status(200).json(req.tenantContext));
  app.use(errorHandler);
  return { app, findUnique };
};

describe('authentication and tenant context', () => {
  it('creates an identity-only JWT with no tenant or role claims', async () => {
    const token = await signAccessToken(userId);
    const payload = decodeJwt(token);

    expect(payload.sub).toBe(userId);
    expect(payload).not.toHaveProperty('tenantId');
    expect(payload).not.toHaveProperty('role');
  });

  it('resolves context for a user who belongs to one requested tenant', async () => {
    const { app, findUnique } = createTestApp();
    const token = await signAccessToken(userId);

    const response = await request(app)
      .get('/context')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-ID', tenantA);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      userId,
      tenantId: tenantA,
      role: 'ADMIN',
      membershipId: 'membership-a',
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { userId_tenantId: { userId, tenantId: tenantA } },
    });
  });

  it('lets the same JWT switch between memberships and resolves each tenant role from the database', async () => {
    const { app } = createTestApp();
    const token = await signAccessToken(userId);

    const tenantAResponse = await request(app)
      .get('/context')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-ID', tenantA);
    const tenantBResponse = await request(app)
      .get('/context')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-ID', tenantB);

    expect(tenantAResponse.body.role).toBe('ADMIN');
    expect(tenantBResponse.body.role).toBe('ANALYST');
    expect(tenantAResponse.body.membershipId).not.toBe(tenantBResponse.body.membershipId);
  });

  it('returns 403 when an authenticated user requests a tenant they do not belong to', async () => {
    const { app } = createTestApp();
    const token = await signAccessToken(userId);

    const response = await request(app)
      .get('/context')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-ID', tenantC);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('TENANT_ACCESS_DENIED');
  });

  it('rejects a forged X-Tenant-ID belonging only to another user', async () => {
    const { app } = createTestApp();
    const token = await signAccessToken(userId);

    const response = await request(app)
      .get('/context')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-ID', tenantC);

    expect(response.status).toBe(403);
  });

  it('ignores a forged role header and authorizes from the membership role only', async () => {
    const { app } = createTestApp('ADMIN');
    const token = await signAccessToken(userId);

    const response = await request(app)
      .get('/context')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-ID', tenantB)
      .set('X-Role', 'ADMIN');

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('requires the tenant header on tenant-scoped routes', async () => {
    const { app } = createTestApp();
    const token = await signAccessToken(userId);

    const response = await request(app).get('/context').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('TENANT_HEADER_REQUIRED');
  });

  it('returns 401 for an invalid JWT before resolving tenant context', async () => {
    const { app } = createTestApp();

    const response = await request(app)
      .get('/context')
      .set('Authorization', 'Bearer forged.token.value')
      .set('X-Tenant-ID', tenantA);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });
});
