-- CreateTable
CREATE TABLE "UserTenantMembership" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTenantMembership_pkey" PRIMARY KEY ("id")
);

-- Preserve the original single-tenant assignment as a membership before removing legacy columns.
INSERT INTO "UserTenantMembership" ("id", "userId", "tenantId", "role", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "id", "tenantId", "role", "createdAt", "updatedAt" FROM "User";

-- DropIndex
DROP INDEX "User_tenantId_email_key";

-- DropIndex
DROP INDEX "User_tenantId_idx";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "tenantId", DROP COLUMN "role";

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserTenantMembership_userId_tenantId_key" ON "UserTenantMembership"("userId", "tenantId");

-- CreateIndex
CREATE INDEX "UserTenantMembership_tenantId_idx" ON "UserTenantMembership"("tenantId");

-- CreateIndex
CREATE INDEX "UserTenantMembership_userId_idx" ON "UserTenantMembership"("userId");

-- AddForeignKey
ALTER TABLE "UserTenantMembership" ADD CONSTRAINT "UserTenantMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTenantMembership" ADD CONSTRAINT "UserTenantMembership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
