import { describe, expect, test } from "bun:test";
import type { ArrivoDb } from "@arrivo/db";
import { clearArticleProgress, getArticleProgress, runWithDbClientFactory, saveArticleProgress } from "../src";

const articleId = "019f0000-0000-7000-8000-000000000010";
const sentenceId = "019f0000-0000-7000-8000-000000000011";

function withDb<T>(mockDb: Partial<ArrivoDb>, run: () => T) {
  return runWithDbClientFactory({
    createDb: () => mockDb as ArrivoDb,
    run
  });
}

describe("article progress", () => {
  test("saves only a visible active sentence for the authenticated user", async () => {
    let articleWhere: any;
    let sentenceWhere: any;
    let upsertArgs: any;
    const articles = {
      findFirst: async (args: any) => {
        articleWhere = args.where;
        return { id: articleId };
      }
    };
    const sentences = {
      findFirst: async (args: any) => {
        sentenceWhere = args.where;
        return { id: sentenceId, sortOrder: 2000 };
      }
    };
    const config = {
      upsert: async (args: any) => {
        upsertArgs = args;
        return {};
      }
    };

    const result = await withDb({ articles, sentences, config } as Partial<ArrivoDb>, () =>
      saveArticleProgress({
        userId: "user-a",
        tenantId: "tenant-a",
        input: { articleId, sentenceId }
      })
    );

    expect(result).toEqual({ articleId, sentenceId });
    expect(articleWhere).toEqual({
      id: articleId,
      tenantId: "tenant-a",
      deletedAt: null,
      OR: [{ userId: "user-a" }, { isPublic: true }]
    });
    expect(sentenceWhere).toEqual({
      id: sentenceId,
      articleId,
      tenantId: "tenant-a",
      deletedAt: null
    });
    expect(upsertArgs.where).toEqual({
      tenantId_key: {
        tenantId: "tenant-a",
        key: `user-article-progress:user-a:${articleId}`
      }
    });
    expect(JSON.parse(upsertArgs.create.value)).toEqual({ sentenceId, sortOrder: 2000 });
    expect(upsertArgs.create.createdBy).toBe("user-a");
    expect(upsertArgs.update.updatedBy).toBe("user-a");
  });

  test("loads the saved sentence and falls forward when that sentence was deleted", async () => {
    let configWhere: any;
    const articles = {
      findFirst: async () => ({ id: articleId })
    };
    const config = {
      findFirst: async (args: any) => {
        configWhere = args.where;
        return {
          value: JSON.stringify({
            sentenceId: "019f0000-0000-7000-8000-000000000099",
            sortOrder: 2000
          })
        };
      }
    };
    const sentences = {
      findMany: async () => [
        { id: "019f0000-0000-7000-8000-000000000021", sortOrder: 1000 },
        { id: "019f0000-0000-7000-8000-000000000023", sortOrder: 3000 }
      ]
    };

    const result = await withDb({ articles, config, sentences } as Partial<ArrivoDb>, () =>
      getArticleProgress({ userId: "user-a", tenantId: "tenant-a", articleId })
    );

    expect(result).toEqual({
      articleId,
      sentenceId: "019f0000-0000-7000-8000-000000000023"
    });
    expect(configWhere).toEqual({
      tenantId: "tenant-a",
      deletedAt: null,
      key: `user-article-progress:user-a:${articleId}`
    });
  });

  test("rejects a sentence outside the article without writing progress", async () => {
    let upserted = false;
    const articles = { findFirst: async () => ({ id: articleId }) };
    const sentences = { findFirst: async () => null };
    const config = {
      upsert: async () => {
        upserted = true;
        return {};
      }
    };

    await expect(withDb({ articles, sentences, config } as Partial<ArrivoDb>, () =>
      saveArticleProgress({
        userId: "user-a",
        tenantId: "tenant-a",
        input: { articleId, sentenceId }
      })
    )).rejects.toThrow("句子不存在");
    expect(upserted).toBe(false);
  });

  test("clears only the current user's progress for this article", async () => {
    let updateManyArgs: any;
    const config = {
      updateMany: async (args: any) => {
        updateManyArgs = args;
        return { count: 1 };
      }
    };

    await withDb({ config } as Partial<ArrivoDb>, () =>
      clearArticleProgress({ userId: "user-a", tenantId: "tenant-a", articleId })
    );

    expect(updateManyArgs.where).toEqual({
      tenantId: "tenant-a",
      deletedAt: null,
      key: `user-article-progress:user-a:${articleId}`
    });
    expect(updateManyArgs.data.deletedBy).toBe("user-a");
    expect(updateManyArgs.data.updatedBy).toBe("user-a");
    expect(updateManyArgs.data.deletedAt).toBeInstanceOf(Date);
  });
});
