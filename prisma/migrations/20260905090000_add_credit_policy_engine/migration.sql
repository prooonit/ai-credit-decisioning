-- CreateEnum
CREATE TYPE "CreditPolicyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CreditDecisionOutcome" AS ENUM ('APPROVED', 'REJECTED', 'MANUAL_REVIEW');

-- CreateTable
CREATE TABLE "CreditPolicy" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "CreditPolicyStatus" NOT NULL DEFAULT 'DRAFT',
    "configuration" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CreditPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditDecision" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "policyId" UUID NOT NULL,
    "policyVersion" INTEGER NOT NULL,
    "decision" "CreditDecisionOutcome" NOT NULL,
    "ruleResults" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreditDecision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CreditPolicy_tenantId_version_key" ON "CreditPolicy"("tenantId", "version");
CREATE INDEX "CreditPolicy_tenantId_status_idx" ON "CreditPolicy"("tenantId", "status");
CREATE UNIQUE INDEX "CreditPolicy_one_active_per_tenant" ON "CreditPolicy"("tenantId") WHERE "status" = 'ACTIVE';
CREATE UNIQUE INDEX "CreditDecision_applicationId_key" ON "CreditDecision"("applicationId");
CREATE INDEX "CreditDecision_tenantId_applicationId_idx" ON "CreditDecision"("tenantId", "applicationId");
CREATE INDEX "CreditDecision_tenantId_createdAt_idx" ON "CreditDecision"("tenantId", "createdAt");

ALTER TABLE "CreditPolicy" ADD CONSTRAINT "CreditPolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditDecision" ADD CONSTRAINT "CreditDecision_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditDecision" ADD CONSTRAINT "CreditDecision_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "LoanApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditDecision" ADD CONSTRAINT "CreditDecision_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "CreditPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
