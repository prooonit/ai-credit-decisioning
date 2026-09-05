import type { UserRole } from '@prisma/client';

export type TenantContext = {
  userId: string;
  tenantId: string;
  role: UserRole;
  membershipId: string;
};
