import type { SentenceExpansionDto, SentenceExpansionInput } from "@arrivo/contracts";
import { httpError } from "@arrivo/runtime";
import { activeRecordWhere, createRecordBase, normalizeTenantId, updateRecordBase } from "../runtime/data-scope";
import { db } from "../runtime/db";

type SentenceExpansionDeps = {
  userId: string;
  tenantId?: string | null;
  articleId: string;
};

const CONFIG_KEY_PREFIX = "user-sentence-expansion:";

function getConfigKey(userId: string, articleId: string) {
  return `${CONFIG_KEY_PREFIX}${userId}:${articleId}`;
}

function parseExpandedIds(value: string | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as { expandedSentenceIds?: unknown };
    return Array.isArray(parsed.expandedSentenceIds)
      ? [...new Set(parsed.expandedSentenceIds.filter((id): id is string => typeof id === "string"))]
      : [];
  } catch {
    return [];
  }
}

async function requireVisibleArticle({ userId, tenantId, articleId }: SentenceExpansionDeps & { tenantId: string }) {
  const article = await db.articles.findFirst({
    where: {
      id: articleId,
      ...activeRecordWhere(tenantId),
      OR: [{ userId }, { isPublic: true }]
    },
    select: { id: true }
  });
  if (!article) throw httpError.notFound("文章不存在");
}

async function getStoredIds({ userId, tenantId, articleId }: SentenceExpansionDeps & { tenantId: string }) {
  const config = await db.config.findFirst({
    where: { key: getConfigKey(userId, articleId), ...activeRecordWhere(tenantId) },
    select: { value: true }
  });
  return parseExpandedIds(config?.value);
}

async function filterExpandableIds({ tenantId, articleId, ids }: { tenantId: string; articleId: string; ids: string[] }) {
  if (!ids.length) return [];
  const sentences = await db.sentences.findMany({
    where: {
      id: { in: ids },
      articleId,
      ...activeRecordWhere(tenantId),
      children: { some: activeRecordWhere(tenantId) }
    },
    select: { id: true }
  });
  const valid = new Set(sentences.map((sentence) => sentence.id));
  return ids.filter((id) => valid.has(id));
}

export async function getSentenceExpansion(input: SentenceExpansionDeps): Promise<SentenceExpansionDto> {
  const tenantId = normalizeTenantId(input.tenantId);
  await requireVisibleArticle({ ...input, tenantId });
  const storedIds = await getStoredIds({ ...input, tenantId });
  const expandedSentenceIds = await filterExpandableIds({ tenantId, articleId: input.articleId, ids: storedIds });
  return { articleId: input.articleId, expandedSentenceIds };
}

export async function updateSentenceExpansion({
  userId,
  tenantId: inputTenantId,
  articleId,
  input
}: SentenceExpansionDeps & { input: SentenceExpansionInput }): Promise<SentenceExpansionDto> {
  const tenantId = normalizeTenantId(inputTenantId);
  await requireVisibleArticle({ userId, tenantId, articleId });

  const sentence = await db.sentences.findFirst({
    where: {
      id: input.sentenceId,
      articleId,
      ...activeRecordWhere(tenantId),
      children: { some: activeRecordWhere(tenantId) }
    },
    select: { id: true }
  });
  if (!sentence) throw httpError.notFound("可展开句子不存在");

  const key = getConfigKey(userId, articleId);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const expandedSentenceIds = await db.$transaction(async (transaction) => {
        const config = await transaction.config.findFirst({
          where: { key, ...activeRecordWhere(tenantId) },
          select: { value: true }
        });
        const storedIds = parseExpandedIds(config?.value);
        const nextIds = input.expanded
          ? [...new Set([...storedIds, input.sentenceId])]
          : storedIds.filter((id) => id !== input.sentenceId);
        const expandable = nextIds.length
          ? await transaction.sentences.findMany({
              where: {
                id: { in: nextIds },
                articleId,
                ...activeRecordWhere(tenantId),
                children: { some: activeRecordWhere(tenantId) }
              },
              select: { id: true }
            })
          : [];
        const valid = new Set(expandable.map((item) => item.id));
        const filteredIds = nextIds.filter((id) => valid.has(id));
        const now = new Date();
        const value = JSON.stringify({ version: 1, expandedSentenceIds: filteredIds });

        await transaction.config.upsert({
          where: { tenantId_key: { tenantId, key } },
          update: {
            value,
            description: "用户文章句子展开状态",
            appName: "arrivo",
            deletedAt: null,
            deletedBy: null,
            ...updateRecordBase({ userId, now })
          },
          create: {
            ...createRecordBase({ userId, tenantId, now }),
            key,
            value,
            description: "用户文章句子展开状态",
            appName: "arrivo"
          }
        });
        return filteredIds;
      }, { isolationLevel: "Serializable" });

      return { articleId, expandedSentenceIds };
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      if (code !== "P2034" || attempt === 2) throw error;
    }
  }

  throw new Error("展开状态保存失败");
}
