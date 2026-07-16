import type { ArticleProgressDto, ArticleProgressInput } from "@arrivo/contracts";
import { httpError } from "@arrivo/runtime";
import {
  activeRecordWhere,
  createRecordBase,
  normalizeTenantId,
  softDeleteRecordBase,
  updateRecordBase
} from "../runtime/data-scope";
import { db } from "../runtime/db";

type ArticleProgressDeps = {
  userId: string;
  tenantId?: string | null;
};

const CONFIG_KEY_PREFIX = "user-article-progress:";

function getConfigKey(userId: string, articleId: string) {
  return `${CONFIG_KEY_PREFIX}${userId}:${articleId}`;
}

function parseStoredProgress(value: string | undefined) {
  if (!value) return null;

  try {
    const progress = JSON.parse(value) as { sentenceId?: unknown; sortOrder?: unknown };
    if (typeof progress.sentenceId !== "string" || !Number.isFinite(progress.sortOrder)) return null;
    return {
      sentenceId: progress.sentenceId,
      sortOrder: Number(progress.sortOrder)
    };
  } catch {
    return null;
  }
}

async function requireVisibleArticle({
  articleId,
  userId,
  tenantId
}: {
  articleId: string;
  userId: string;
  tenantId: string;
}) {
  const article = await db.articles.findFirst({
    where: {
      id: articleId,
      ...activeRecordWhere(tenantId),
      OR: [{ userId }, { isPublic: true }]
    },
    select: { id: true }
  });

  if (!article) throw httpError.notFound("文章不存在");
  return article;
}

export async function saveArticleProgress({
  userId,
  tenantId: inputTenantId,
  input
}: ArticleProgressDeps & { input: ArticleProgressInput }): Promise<ArticleProgressDto> {
  const tenantId = normalizeTenantId(inputTenantId);
  await requireVisibleArticle({ articleId: input.articleId, userId, tenantId });

  const sentence = await db.sentences.findFirst({
    where: {
      id: input.sentenceId,
      articleId: input.articleId,
      ...activeRecordWhere(tenantId)
    },
    select: {
      id: true,
      sortOrder: true
    }
  });

  if (!sentence) throw httpError.notFound("句子不存在");

  const key = getConfigKey(userId, input.articleId);
  const value = JSON.stringify({ sentenceId: sentence.id, sortOrder: sentence.sortOrder });
  const now = new Date();

  await db.config.upsert({
    where: {
      tenantId_key: { tenantId, key }
    },
    update: {
      value,
      description: "用户文章播放断点",
      appName: "arrivo",
      deletedAt: null,
      deletedBy: null,
      ...updateRecordBase({ userId, now })
    },
    create: {
      ...createRecordBase({ userId, tenantId, now }),
      key,
      value,
      description: "用户文章播放断点",
      appName: "arrivo"
    }
  });

  return input;
}

export async function getArticleProgress({
  userId,
  tenantId: inputTenantId,
  articleId
}: ArticleProgressDeps & { articleId: string }): Promise<ArticleProgressDto | null> {
  const tenantId = normalizeTenantId(inputTenantId);
  await requireVisibleArticle({ articleId, userId, tenantId });

  const config = await db.config.findFirst({
    where: {
      key: getConfigKey(userId, articleId),
      ...activeRecordWhere(tenantId)
    },
    select: { value: true }
  });
  const stored = parseStoredProgress(config?.value);
  if (!stored) return null;

  const sentences = await db.sentences.findMany({
    where: {
      articleId,
      ...activeRecordWhere(tenantId)
    },
    select: {
      id: true,
      sortOrder: true
    },
    orderBy: [
      { sortOrder: "asc" },
      { createdAt: "asc" },
      { id: "asc" }
    ]
  });

  const sentence = sentences.find((item) => item.id === stored.sentenceId)
    ?? sentences.find((item) => item.sortOrder >= stored.sortOrder)
    ?? sentences.at(-1);

  return sentence ? { articleId, sentenceId: sentence.id } : null;
}

export async function clearArticleProgress({
  userId,
  tenantId: inputTenantId,
  articleId
}: ArticleProgressDeps & { articleId: string }): Promise<void> {
  const tenantId = normalizeTenantId(inputTenantId);

  await db.config.updateMany({
    where: {
      key: getConfigKey(userId, articleId),
      ...activeRecordWhere(tenantId)
    },
    data: softDeleteRecordBase({ userId })
  });
}
