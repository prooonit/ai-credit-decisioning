-- AlterTable
ALTER TABLE "Tenant" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "UserTenantMembership" ALTER COLUMN "id" DROP DEFAULT;
