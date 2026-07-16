import type {
  ArticleDetailDto,
  ArticleDto,
  CreateArticleInput,
  CreateSentenceInput,
  DeleteArticleInput,
  DeleteSentenceInput,
  MoveSentenceInput,
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

function getArticleSelect(tenantId: string) {
  return {
    id: true,
    title: true,
    userId: true,
    isPublic: true,
    createdAt: true,
    updatedAt: true,
    Sentences: {
      where: activeRecordWhere(tenantId),
      select: {
        id: true,
        originalContent: true,
        translatedContent: true,
        sortOrder: true
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
      articleId: true
    }
  });

  if (!sentence?.articleId) {
    throw httpError.forbidden("只能编辑自己的文章");
  }

  return {
    id: sentence.id,
    articleId: sentence.articleId
  };
}

async function getOrderedSentenceIds({ articleId, tenantId }: { articleId: string; tenantId: string }) {
  return db.sentences.findMany({
    where: {
      articleId,
      ...activeRecordWhere(tenantId)
    },
    select: {
      id: true
    },
    orderBy: sentenceOrderBy
  });
}

async function rewriteSentenceOrder({
  articleId,
  tenantId,
  userId,
  orderedIds
}: {
  articleId: string;
  tenantId: string;
  userId: string;
  orderedIds: string[];
}) {
  const now = new Date();

  if (!orderedIds.length) {
    return;
  }

  await db.$transaction(
    orderedIds.map((id, index) =>
      db.sentences.updateMany({
        where: {
          id,
          articleId,
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
  const sentences = await getOrderedSentenceIds({ articleId, tenantId });
  await rewriteSentenceOrder({
    articleId,
    tenantId,
    userId,
    orderedIds: sentences.map((sentence) => sentence.id)
  });
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
  return db.articles.findMany({
    where: ownOrPublicArticleWhere({ userId, tenantId }),
    select: getArticleSelect(tenantId),
    orderBy: articleOrderBy
  });
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
    nextArticleId: nextArticle?.id ?? null
  };
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
        data: sentences.map((sentence, index) => ({
          ...createRecordBase({ userId, tenantId, now }),
          articleId,
          content: sentence.original || sentence.translation || "",
          originalContent: sentence.original || "",
          translatedContent: sentence.translation || "",
          sortOrder: getSentenceSortOrder(index)
        }))
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
  const sentence = await db.sentences.create({
    data: {
      ...createRecordBase({ userId, tenantId, now }),
      articleId: input.articleId,
      content: input.original || input.translation || "",
      originalContent: input.original || "",
      translatedContent: input.translation || "",
      sortOrder: 0
    },
    select: {
      id: true
    }
  });
  const currentIds = (await getOrderedSentenceIds({ articleId: input.articleId, tenantId }))
    .map((item) => item.id)
    .filter((id) => id !== sentence.id);
  const insertIndex = Math.min(Math.max(input.insertIndex ?? currentIds.length, 0), currentIds.length);
  const orderedIds = [...currentIds.slice(0, insertIndex), sentence.id, ...currentIds.slice(insertIndex)];

  await rewriteSentenceOrder({ articleId: input.articleId, tenantId, userId, orderedIds });
  return getRequiredArticleDetail({ userId, tenantId, id: input.articleId });
}

export async function updateSentence({
  userId,
  tenantId: inputTenantId,
  input
}: ArticleCaseDeps & { input: UpdateSentenceInput }) {
  const tenantId = normalizeTenantId(inputTenantId);
  const sentence = await getWritableSentence({ userId, tenantId, id: input.id });

  await db.sentences.updateMany({
    where: {
      id: input.id,
      ...activeRecordWhere(tenantId)
    },
    data: {
      content: input.original || input.translation || "",
      originalContent: input.original || "",
      translatedContent: input.translation || "",
      ...updateRecordBase({ userId })
    }
  });

  return getRequiredArticleDetail({ userId, tenantId, id: sentence.articleId });
}

export async function deleteSentence({
  userId,
  tenantId: inputTenantId,
  input
}: ArticleCaseDeps & { input: DeleteSentenceInput }) {
  const tenantId = normalizeTenantId(inputTenantId);
  const sentence = await getWritableSentence({ userId, tenantId, id: input.id });

  await db.sentences.updateMany({
    where: {
      id: input.id,
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
  const orderedIds = (await getOrderedSentenceIds({ articleId: sentence.articleId, tenantId })).map((item) => item.id);
  const currentIndex = orderedIds.indexOf(input.id);
  const targetIndex = input.direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedIds.length) {
    return getRequiredArticleDetail({ userId, tenantId, id: sentence.articleId });
  }

  [orderedIds[currentIndex], orderedIds[targetIndex]] = [orderedIds[targetIndex], orderedIds[currentIndex]];
  await rewriteSentenceOrder({ articleId: sentence.articleId, tenantId, userId, orderedIds });

  return getRequiredArticleDetail({ userId, tenantId, id: sentence.articleId });
}
