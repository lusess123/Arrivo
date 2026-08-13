import type {
  ArticleDetailDto,
  ArticleDto,
  CreateArticleInput,
  CreateSentenceInput,
  DeleteArticleInput,
  DeleteSentenceInput,
  MoveSentenceInput,
  SentenceSplitStatus,
  UpdateArticleInput,
  UpdateSentenceInput
} from "@arrivo/contracts";
import { httpError } from "@arrivo/runtime";
import {
  activeRecordWhere,
  createRecordBase,
  normalizeTenantId,
  softDeleteRecordBase,
  updateRecordBase
} from "../runtime/data-scope";
import { db } from "../runtime/db";

type ArticleCaseDeps = { userId: string; tenantId?: string | null };

const SENTENCE_ORDER_STEP = 1000;
const sentenceOrderBy = [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }, { id: "asc" as const }];
const articleOrderBy = [{ createdAt: "desc" as const }, { id: "desc" as const }];

function getAvailableLanguages(sentences: Array<{ languageCode: string; parentSentenceId: string | null }>) {
  return [...new Set(sentences
    .filter((sentence) => sentence.parentSentenceId === null)
    .map((sentence) => sentence.languageCode || "en"))];
}

function toArticleSentenceDto<T extends {
  id: string;
  languageCode: string;
  sentenceGroupId: string;
  splitStatus: string;
}>(sentence: T) {
  return {
    ...sentence,
    languageCode: sentence.languageCode || "en",
    sentenceGroupId: sentence.sentenceGroupId || sentence.id,
    splitStatus: sentence.splitStatus as SentenceSplitStatus
  };
}

function getArticleSelect(tenantId: string) {
  return {
    id: true,
    title: true,
    userId: true,
    isPublic: true,
    playCount: true,
    createdAt: true,
    updatedAt: true,
    Sentences: {
      where: activeRecordWhere(tenantId),
      select: {
        id: true,
        originalContent: true,
        translatedContent: true,
        languageCode: true,
        sentenceGroupId: true,
        sortOrder: true,
        parentSentenceId: true,
        splitStatus: true,
        playCount: true,
        playedWordIndexes: true
      },
      orderBy: sentenceOrderBy
    }
  };
}

function ownOrPublicArticleWhere({ userId, tenantId }: { userId: string; tenantId: string }) {
  return {
    ...activeRecordWhere(tenantId),
    OR: [{ userId }, { isPublic: true }]
  };
}

function getSentenceSortOrder(index: number) {
  return (index + 1) * SENTENCE_ORDER_STEP;
}

async function getWritableArticle({
  userId,
  tenantId,
  id
}: {
  userId: string;
  tenantId: string;
  id: string;
}) {
  const article = await db.articles.findFirst({
    where: {
      id,
      userId,
      isPublic: false,
      ...activeRecordWhere(tenantId)
    },
    select: {
      id: true
    }
  });

  if (!article) {
    throw httpError.forbidden("只能编辑自己的文章");
  }

  return article;
}

async function getWritableSentence({
  userId,
  tenantId,
  id
}: {
  userId: string;
  tenantId: string;
  id: string;
}) {
  const sentence = await db.sentences.findFirst({
    where: {
      id,
      ...activeRecordWhere(tenantId),
      article: {
        is: {
          userId,
          isPublic: false,
          ...activeRecordWhere(tenantId)
        }
      }
    },
    select: {
      id: true,
      articleId: true,
      sentenceGroupId: true,
      parentSentenceId: true
    }
  });

  if (!sentence?.articleId) {
    throw httpError.forbidden("只能编辑自己的文章");
  }

  return {
    id: sentence.id,
    articleId: sentence.articleId,
    sentenceGroupId: sentence.sentenceGroupId,
    parentSentenceId: sentence.parentSentenceId
  };
}

async function getOrderedSentenceGroups({ articleId, tenantId }: { articleId: string; tenantId: string }) {
  const roots = await db.sentences.findMany({
    where: {
      articleId,
      parentSentenceId: null,
      ...activeRecordWhere(tenantId)
    },
    select: {
      sentenceGroupId: true,
      sortOrder: true
    },
    orderBy: sentenceOrderBy
  });
  const seen = new Set<string>();
  return roots.filter((sentence) => {
    if (seen.has(sentence.sentenceGroupId)) return false;
    seen.add(sentence.sentenceGroupId);
    return true;
  });
}

async function rewriteSentenceOrder({
  articleId,
  tenantId,
  userId,
  orderedGroupIds
}: {
  articleId: string;
  tenantId: string;
  userId: string;
  orderedGroupIds: string[];
}) {
  const now = new Date();

  if (!orderedGroupIds.length) {
    return;
  }

  await db.$transaction(
    orderedGroupIds.map((sentenceGroupId, index) =>
      db.sentences.updateMany({
        where: {
          sentenceGroupId,
          articleId,
          parentSentenceId: null,
          ...activeRecordWhere(tenantId)
        },
        data: {
          sortOrder: getSentenceSortOrder(index),
          ...updateRecordBase({ userId, now })
        }
      })
    )
  );
}

async function normalizeSentenceOrder({
  articleId,
  tenantId,
  userId
}: {
  articleId: string;
  tenantId: string;
  userId: string;
}) {
  const sentences = await getOrderedSentenceGroups({ articleId, tenantId });
  await rewriteSentenceOrder({
    articleId,
    tenantId,
    userId,
    orderedGroupIds: sentences.map((sentence) => sentence.sentenceGroupId)
  });
}

async function getDescendantSentenceIds({ articleId, sentenceId, tenantId }: { articleId: string; sentenceId: string; tenantId: string }) {
  const sentences = await db.sentences.findMany({
    where: { articleId, ...activeRecordWhere(tenantId) },
    select: { id: true, parentSentenceId: true }
  });
  const descendants: string[] = [];
  const pending = [sentenceId];
  while (pending.length) {
    const parentId = pending.shift()!;
    for (const sentence of sentences) {
      if (sentence.parentSentenceId === parentId) {
        descendants.push(sentence.id);
        pending.push(sentence.id);
      }
    }
  }
  return descendants;
}

async function getRequiredArticleDetail({
  userId,
  tenantId,
  id
}: {
  userId: string;
  tenantId: string;
  id: string;
}) {
  const article = await getArticleDetail({ userId, tenantId, id });
  if (!article) throw httpError.notFound("文章不存在");
  return article;
}

export async function getArticleList({ userId, tenantId: inputTenantId }: ArticleCaseDeps): Promise<ArticleDto[]> {
  const tenantId = normalizeTenantId(inputTenantId);
  const articles = await db.articles.findMany({
    where: ownOrPublicArticleWhere({ userId, tenantId }),
    select: getArticleSelect(tenantId),
    orderBy: articleOrderBy
  });
  return articles.map((article) => ({
    ...article,
    availableLanguages: getAvailableLanguages(article.Sentences),
    Sentences: article.Sentences.map(toArticleSentenceDto)
  }));
}

export async function getArticleDetail({
  userId,
  tenantId: inputTenantId,
  id
}: ArticleCaseDeps & { id: string }): Promise<ArticleDetailDto | null> {
  const tenantId = normalizeTenantId(inputTenantId);
  const article = await db.articles.findFirst({
    where: {
      id,
      ...ownOrPublicArticleWhere({ userId, tenantId })
    },
    select: getArticleSelect(tenantId)
  });

  if (!article) return null;

  const nextArticle = await db.articles.findFirst({
    where: {
      ...activeRecordWhere(tenantId),
      AND: [
        { OR: [{ userId }, { isPublic: true }] },
        {
          OR: [
            { createdAt: { lt: article.createdAt } },
            { createdAt: article.createdAt, id: { lt: article.id } }
          ]
        }
      ]
    },
    select: {
      id: true
    },
    orderBy: articleOrderBy
  });

  return {
    ...article,
    availableLanguages: getAvailableLanguages(article.Sentences),
    Sentences: article.Sentences.map(toArticleSentenceDto),
    nextArticleId: nextArticle?.id ?? null
  };
}

export async function incrementArticlePlayCount({
  userId,
  tenantId: inputTenantId,
  id
}: ArticleCaseDeps & { id: string }): Promise<{ playCount: number }> {
  const tenantId = normalizeTenantId(inputTenantId);
  const article = await db.articles.findFirst({
    where: {
      id,
      ...ownOrPublicArticleWhere({ userId, tenantId })
    },
    select: { id: true }
  });

  if (!article) throw httpError.notFound("文章不存在");

  return db.articles.update({
    where: { id: article.id },
    data: {
      playCount: { increment: 1 }
    },
    select: { playCount: true }
  });
}

export async function incrementSentencePlayCount({
  userId,
  tenantId: inputTenantId,
  id
}: ArticleCaseDeps & { id: string }): Promise<{ playCount: number }> {
  const tenantId = normalizeTenantId(inputTenantId);
  const sentence = await db.sentences.findFirst({
    where: {
      id,
      ...activeRecordWhere(tenantId),
      article: {
        is: ownOrPublicArticleWhere({ userId, tenantId })
      }
    },
    select: { id: true }
  });

  if (!sentence) throw httpError.notFound("句子不存在");

  return db.sentences.update({
    where: { id: sentence.id },
    data: { playCount: { increment: 1 } },
    select: { playCount: true }
  });
}

export async function recordSentenceWordPlay({
  userId,
  tenantId: inputTenantId,
  id,
  wordIndex
}: ArticleCaseDeps & { id: string; wordIndex: number }): Promise<{ playedWordIndexes: number[] }> {
  const tenantId = normalizeTenantId(inputTenantId);
  const sentence = await db.sentences.findFirst({
    where: {
      id,
      ...activeRecordWhere(tenantId),
      article: {
        is: ownOrPublicArticleWhere({ userId, tenantId })
      }
    },
    select: { id: true, playedWordIndexes: true }
  });

  if (!sentence) throw httpError.notFound("句子不存在");

  if (sentence.playedWordIndexes.includes(wordIndex)) {
    return { playedWordIndexes: sentence.playedWordIndexes };
  }

  return db.sentences.update({
    where: { id: sentence.id },
    data: { playedWordIndexes: [...sentence.playedWordIndexes, wordIndex] },
    select: { playedWordIndexes: true }
  });
}

export async function createArticle({
  userId,
  tenantId: inputTenantId,
  input
}: ArticleCaseDeps & { input: CreateArticleInput }) {
  const tenantId = normalizeTenantId(inputTenantId);
  const now = new Date();
  const sentences = input.sentences.filter((sentence) => sentence.original || sentence.translation);
  const existing = await db.articles.findFirst({
    where: {
      title: input.title,
      userId,
      ...activeRecordWhere(tenantId)
    },
    select: {
      id: true
    }
  });

  const articleBase = createRecordBase({ userId, tenantId, now });
  const articleId = existing?.id ?? articleBase.id;
  const operations = [];

  if (existing) {
    operations.push(
      db.articles.updateMany({
        where: {
          id: articleId,
          userId,
          ...activeRecordWhere(tenantId)
        },
        data: {
          title: input.title,
          content: "",
          ...(input.isPublic === undefined ? {} : { isPublic: input.isPublic }),
          ...updateRecordBase({ userId, now })
        }
      }),
      db.sentences.updateMany({
        where: {
          articleId,
          ...activeRecordWhere(tenantId)
        },
        data: {
          ...softDeleteRecordBase({ userId, now })
        }
      })
    );
  } else {
    operations.push(
      db.articles.create({
        data: {
          ...articleBase,
          title: input.title,
          content: "",
          userId,
          isPublic: input.isPublic ?? false
        }
      })
    );
  }

  if (sentences.length > 0) {
    operations.push(
      db.sentences.createMany({
        data: sentences.map((sentence, index) => {
          const record = createRecordBase({ userId, tenantId, now });
          return {
            ...record,
            articleId,
            sentenceGroupId: record.id,
            languageCode: sentence.languageCode,
            content: sentence.original || sentence.translation || "",
            originalContent: sentence.original || "",
            translatedContent: sentence.translation || "",
            sortOrder: getSentenceSortOrder(index)
          };
        })
      })
    );
  }

  await db.$transaction(operations);
  return getRequiredArticleDetail({ userId, tenantId, id: articleId });
}

export async function updateArticle({
  userId,
  tenantId: inputTenantId,
  input
}: ArticleCaseDeps & { input: UpdateArticleInput }) {
  const tenantId = normalizeTenantId(inputTenantId);
  await getWritableArticle({ userId, tenantId, id: input.id });

  await db.articles.updateMany({
    where: {
      id: input.id,
      userId,
      ...activeRecordWhere(tenantId)
    },
    data: {
      title: input.title,
      ...updateRecordBase({ userId })
    }
  });

  return getRequiredArticleDetail({ userId, tenantId, id: input.id });
}

export async function deleteArticle({
  userId,
  tenantId: inputTenantId,
  input
}: ArticleCaseDeps & { input: DeleteArticleInput }) {
  const tenantId = normalizeTenantId(inputTenantId);
  await getWritableArticle({ userId, tenantId, id: input.id });
  const now = new Date();

  await db.$transaction([
    db.articles.updateMany({
      where: {
        id: input.id,
        userId,
        ...activeRecordWhere(tenantId)
      },
      data: {
        ...softDeleteRecordBase({ userId, now })
      }
    }),
    db.sentences.updateMany({
      where: {
        articleId: input.id,
        ...activeRecordWhere(tenantId)
      },
      data: {
        ...softDeleteRecordBase({ userId, now })
      }
    })
  ]);

  return { id: input.id };
}

export async function createSentence({
  userId,
  tenantId: inputTenantId,
  input
}: ArticleCaseDeps & { input: CreateSentenceInput }) {
  const tenantId = normalizeTenantId(inputTenantId);
  await getWritableArticle({ userId, tenantId, id: input.articleId });
  const now = new Date();
  const record = createRecordBase({ userId, tenantId, now });
  const existingGroupRoot = input.sentenceGroupId
    ? await db.sentences.findFirst({
        where: {
          articleId: input.articleId,
          sentenceGroupId: input.sentenceGroupId,
          parentSentenceId: null,
          ...activeRecordWhere(tenantId)
        },
        select: { sortOrder: true }
      })
    : null;
  if (input.sentenceGroupId && !existingGroupRoot) throw httpError.notFound("对应的句子组不存在");

  if (input.sentenceGroupId) {
    const duplicate = await db.sentences.findFirst({
      where: {
        articleId: input.articleId,
        sentenceGroupId: input.sentenceGroupId,
        languageCode: input.languageCode,
        parentSentenceId: null,
        ...activeRecordWhere(tenantId)
      },
      select: { id: true }
    });
    if (duplicate) throw httpError.badRequest("这个句子已经有该语言内容");
  }

  const sentenceGroupId = input.sentenceGroupId ?? record.id;
  const sentence = await db.sentences.create({
    data: {
      ...record,
      articleId: input.articleId,
      sentenceGroupId,
      languageCode: input.languageCode,
      content: input.original || input.translation || "",
      originalContent: input.original || "",
      translatedContent: input.translation || "",
      sortOrder: existingGroupRoot?.sortOrder ?? 0
    },
    select: {
      id: true
    }
  });
  if (!input.sentenceGroupId) {
    const currentGroupIds = (await getOrderedSentenceGroups({ articleId: input.articleId, tenantId }))
      .map((item) => item.sentenceGroupId)
      .filter((id) => id !== sentenceGroupId);
    const insertIndex = Math.min(
      Math.max(input.insertIndex ?? currentGroupIds.length, 0),
      currentGroupIds.length
    );
    const orderedGroupIds = [
      ...currentGroupIds.slice(0, insertIndex),
      sentenceGroupId,
      ...currentGroupIds.slice(insertIndex)
    ];
    await rewriteSentenceOrder({ articleId: input.articleId, tenantId, userId, orderedGroupIds });
  }
  return getRequiredArticleDetail({ userId, tenantId, id: input.articleId });
}

export async function updateSentence({
  userId,
  tenantId: inputTenantId,
  input
}: ArticleCaseDeps & { input: UpdateSentenceInput }) {
  const tenantId = normalizeTenantId(inputTenantId);
  const sentence = await getWritableSentence({ userId, tenantId, id: input.id });
  const descendantIds = await getDescendantSentenceIds({ articleId: sentence.articleId, sentenceId: input.id, tenantId });
  const now = new Date();

  await db.$transaction([
    db.sentences.updateMany({
      where: { id: input.id, ...activeRecordWhere(tenantId) },
      data: {
        content: input.original || input.translation || "",
        originalContent: input.original || "",
        translatedContent: input.translation || "",
        splitStatus: "UNKNOWN",
        splitAnalyzedAt: null,
        splitModel: null,
        splitVersion: null,
        playedWordIndexes: [],
        ...updateRecordBase({ userId, now })
      }
    }),
    db.sentences.updateMany({
      where: { id: { in: descendantIds }, ...activeRecordWhere(tenantId) },
      data: softDeleteRecordBase({ userId, now })
    })
  ]);

  return getRequiredArticleDetail({ userId, tenantId, id: sentence.articleId });
}

export async function deleteSentence({
  userId,
  tenantId: inputTenantId,
  input
}: ArticleCaseDeps & { input: DeleteSentenceInput }) {
  const tenantId = normalizeTenantId(inputTenantId);
  const sentence = await getWritableSentence({ userId, tenantId, id: input.id });
  const descendantIds = sentence.parentSentenceId
    ? await getDescendantSentenceIds({ articleId: sentence.articleId, sentenceId: input.id, tenantId })
    : [];

  await db.sentences.updateMany({
    where: sentence.parentSentenceId
      ? {
          id: { in: [input.id, ...descendantIds] },
          ...activeRecordWhere(tenantId)
        }
      : {
          articleId: sentence.articleId,
          sentenceGroupId: sentence.sentenceGroupId,
          ...activeRecordWhere(tenantId)
        },
    data: {
      ...softDeleteRecordBase({ userId })
    }
  });
  await normalizeSentenceOrder({ articleId: sentence.articleId, tenantId, userId });

  return getRequiredArticleDetail({ userId, tenantId, id: sentence.articleId });
}

export async function moveSentence({
  userId,
  tenantId: inputTenantId,
  input
}: ArticleCaseDeps & { input: MoveSentenceInput }) {
  const tenantId = normalizeTenantId(inputTenantId);
  const sentence = await getWritableSentence({ userId, tenantId, id: input.id });
  if (sentence.parentSentenceId) throw httpError.badRequest("只能移动文章根句子");
  const orderedGroupIds = (await getOrderedSentenceGroups({ articleId: sentence.articleId, tenantId }))
    .map((item) => item.sentenceGroupId);
  const currentIndex = orderedGroupIds.indexOf(sentence.sentenceGroupId);
  const targetIndex = input.direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedGroupIds.length) {
    return getRequiredArticleDetail({ userId, tenantId, id: sentence.articleId });
  }

  [orderedGroupIds[currentIndex], orderedGroupIds[targetIndex]] = [
    orderedGroupIds[targetIndex],
    orderedGroupIds[currentIndex]
  ];
  await rewriteSentenceOrder({ articleId: sentence.articleId, tenantId, userId, orderedGroupIds });

  return getRequiredArticleDetail({ userId, tenantId, id: sentence.articleId });
}
