import type { AuthUserDto } from "@arrivo/contracts";
import { createUuidV7 } from "@open-kit/infra/id";

export const DEFAULT_TENANT_ID = "helloworld";

export function normalizeTenantId(tenantId?: string | null) {
  return tenantId?.trim() || DEFAULT_TENANT_ID;
}

export function getUserTenantId(user: Pick<AuthUserDto, "tenant">) {
  return normalizeTenantId(user.tenant);
}

export function activeRecordWhere(tenantId?: string | null) {
  return {
    tenantId: normalizeTenantId(tenantId),
    deletedAt: null
  };
}

export function createRecordBase({
  userId,
  tenantId,
  now = new Date()
}: {
  userId?: string | null;
  tenantId?: string | null;
  now?: Date;
}) {
  return {
    id: createUuidV7(now),
    tenantId: normalizeTenantId(tenantId),
    createdAt: now,
    updatedAt: now,
    ...(userId ? { createdBy: userId, updatedBy: userId } : {})
  };
}

export function updateRecordBase({ userId, now = new Date() }: { userId?: string | null; now?: Date }) {
  return {
    updatedAt: now,
    ...(userId ? { updatedBy: userId } : {})
  };
}

export function softDeleteRecordBase({ userId, now = new Date() }: { userId?: string | null; now?: Date }) {
  return {
    deletedAt: now,
    ...(userId ? { deletedBy: userId, updatedBy: userId } : {}),
    updatedAt: now
  };
}
