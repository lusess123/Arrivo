import type {
  SentenceTextVisibility,
  SentenceVisibilityDto,
  SentenceVisibilityInput
} from "@arrivo/contracts";
import type { ArrivoDb } from "@arrivo/db";
import { httpError } from "@arrivo/runtime";
import {
  activeRecordWhere,
  createRecordBase,
  normalizeTenantId,
  updateRecordBase
} from "../runtime/data-scope";
import { db } from "../runtime/db";

type SentenceVisibilityDeps = {
  userId: string;
  tenantId?: string | null;
  articleId: string;
};

const CONFIG_KEY_PREFIX = "user-sentence-visibility:";

function getConfigKey(userId: string, articleId: string) {
  return `${CONFIG_KEY_PREFIX}${userId}:${articleId}`;
}

function parseVisibility(value: string | undefined) {
  const visibilityBySentenceId: Record<string, SentenceTextVisibility> = {};
  if (!value) return visibilityBySentenceId;

  try {
    const parsed = JSON.parse(value) as { visibilityBySentenceId?: unknown };
    if (!parsed.visibilityBySentenceId || typeof parsed.visibilityBySentenceId !== "object") {
      return visibilityBySentenceId;
    }
    for (const [sentenceId, visibility] of Object.entries(parsed.visibilityBySentenceId)) {
      if (
        visibility
        && typeof visibility === "object"
        && "showOriginal" in visibility
        && typeof visibility.showOriginal === "boolean"
        && "showTranslation" in visibility
        && typeof visibility.showTranslation === "boolean"
      ) {
        visibilityBySentenceId[sentenceId] = {
          showOriginal: visibility.showOriginal,
          showTranslation: visibility.showTranslation
        };
      }
    }
  } catch {
    return {};
  }

  return visibilityBySentenceId;
}

async function requireVisibleArticle({
  userId,
  tenantId,
  articleId
}: SentenceVisibilityDeps & { tenantId: string }) {
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

async function filterExistingSentences({
  client,
  tenantId,
  articleId,
  visibilityBySentenceId
}: {
  client: Pick<ArrivoDb, "sentences">;
  tenantId: string;
  articleId: string;
  visibilityBySentenceId: Record<string, SentenceTextVisibility>;
}) {
  const ids = Object.keys(visibilityBySentenceId);
  if (!ids.length) return {};
  const sentences = await client.sentences.findMany({
    where: {
      id: { in: ids },
      articleId,
      ...activeRecordWhere(tenantId)
    },
    select: { id: true }
  });
  const existingIds = new Set(sentences.map((sentence) => sentence.id));
  return Object.fromEntries(
    Object.entries(visibilityBySentenceId).filter(([sentenceId]) => existingIds.has(sentenceId))
  );
}

export async function getSentenceVisibility(
  input: SentenceVisibilityDeps
): Promise<SentenceVisibilityDto> {
  const tenantId = normalizeTenantId(input.tenantId);
  await requireVisibleArticle({ ...input, tenantId });
  const config = await db.config.findFirst({
    where: {
      key: getConfigKey(input.userId, input.articleId),
      ...activeRecordWhere(tenantId)
    },
    select: { value: true }
  });
  const visibilityBySentenceId = await filterExistingSentences({
    client: db,
    tenantId,
    articleId: input.articleId,
    visibilityBySentenceId: parseVisibility(config?.value)
  });
  return { articleId: input.articleId, visibilityBySentenceId };
}

export async function updateSentenceVisibility({
  userId,
  tenantId: inputTenantId,
  articleId,
  input
}: SentenceVisibilityDeps & { input: SentenceVisibilityInput }): Promise<SentenceVisibilityDto> {
  const tenantId = normalizeTenantId(inputTenantId);
  await requireVisibleArticle({ userId, tenantId, articleId });

  const sentence = await db.sentences.findFirst({
    where: {
      id: input.sentenceId,
      articleId,
      ...activeRecordWhere(tenantId)
    },
    select: { id: true }
  });
  if (!sentence) throw httpError.notFound("句子不存在");

  const key = getConfigKey(userId, articleId);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const visibilityBySentenceId = await db.$transaction(async (transaction) => {
        const config = await transaction.config.findFirst({
          where: { key, ...activeRecordWhere(tenantId) },
          select: { value: true }
        });
        const nextVisibility = parseVisibility(config?.value);
        nextVisibility[input.sentenceId] = {
          showOriginal: input.showOriginal,
          showTranslation: input.showTranslation
        };
        const filteredVisibility = await filterExistingSentences({
          client: transaction,
          tenantId,
          articleId,
          visibilityBySentenceId: nextVisibility
        });
        const now = new Date();
        const value = JSON.stringify({ version: 1, visibilityBySentenceId: filteredVisibility });

        await transaction.config.upsert({
          where: { tenantId_key: { tenantId, key } },
          update: {
            value,
            description: "用户文章单句显示偏好",
            appName: "arrivo",
            deletedAt: null,
            deletedBy: null,
            ...updateRecordBase({ userId, now })
          },
          create: {
            ...createRecordBase({ userId, tenantId, now }),
            key,
            value,
            description: "用户文章单句显示偏好",
            appName: "arrivo"
          }
        });
        return filteredVisibility;
      }, { isolationLevel: "Serializable" });

      return { articleId, visibilityBySentenceId };
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      if (code !== "P2034" || attempt === 2) throw error;
    }
  }

  throw new Error("单句显示偏好保存失败");
}
