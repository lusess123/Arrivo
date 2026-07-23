import {
  lastVisitedPageInputSchema,
  type LastVisitedPageInput,
} from "@arrivo/contracts";
import {
  activeRecordWhere,
  createRecordBase,
  normalizeTenantId,
  updateRecordBase,
} from "../runtime/data-scope";
import { db } from "../runtime/db";

type LastVisitedPageDeps = {
  userId: string;
  tenantId?: string | null;
};

const CONFIG_KEY_PREFIX = "user-last-visited-page:";

function getConfigKey(userId: string) {
  return `${CONFIG_KEY_PREFIX}${userId}`;
}

function parseStoredPath(value: string | undefined) {
  if (!value) return null;

  try {
    const result = lastVisitedPageInputSchema.safeParse(JSON.parse(value));
    return result.success ? result.data.path : null;
  } catch {
    return null;
  }
}

export async function getLastVisitedPage({
  userId,
  tenantId: inputTenantId,
}: LastVisitedPageDeps) {
  const tenantId = normalizeTenantId(inputTenantId);
  const config = await db.config.findFirst({
    where: {
      key: getConfigKey(userId),
      ...activeRecordWhere(tenantId),
    },
    select: { value: true },
  });

  return parseStoredPath(config?.value);
}

export async function updateLastVisitedPage({
  userId,
  tenantId: inputTenantId,
  input,
}: LastVisitedPageDeps & { input: LastVisitedPageInput }) {
  const tenantId = normalizeTenantId(inputTenantId);
  const key = getConfigKey(userId);
  const now = new Date();
  const value = JSON.stringify(input);

  await db.config.upsert({
    where: { tenantId_key: { tenantId, key } },
    update: {
      value,
      description: "用户最后访问页面",
      appName: "arrivo",
      deletedAt: null,
      deletedBy: null,
      ...updateRecordBase({ userId, now }),
    },
    create: {
      ...createRecordBase({ userId, tenantId, now }),
      key,
      value,
      description: "用户最后访问页面",
      appName: "arrivo",
    },
  });

  return input.path;
}
