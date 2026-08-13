import { describe, expect, test } from "bun:test";
import type { ArrivoDb } from "@arrivo/db";
import { createSentence, deleteSentence, runWithDbClientFactory } from "../src";

const articleId = "019f0000-0000-7000-8000-000000000010";
const sentenceGroupId = "019f0000-0000-7000-8000-000000000020";
const createdSentenceId = "019f0000-0000-7000-8000-000000000030";

function withDb<T>(mockDb: Partial<ArrivoDb>, run: () => T) {
  return runWithDbClientFactory({
    createDb: () => mockDb as ArrivoDb,
    run
  });
}

describe("parallel language sentences", () => {
  test("adds a new language root to an existing semantic sentence group", async () => {
    let createdData: any;
    const articles = {
      findFirst: async (args: any) => {
        if (!args.where.id) return null;
        if (Object.keys(args.select).length === 1) return { id: articleId };
        return {
          id: articleId,
          title: "Parallel languages",
          userId: "user-a",
          isPublic: false,
          playCount: 0,
          createdAt: new Date("2026-08-13T00:00:00Z"),
          updatedAt: new Date("2026-08-13T00:00:00Z"),
          Sentences: []
        };
      }
    };
    const sentences = {
      findFirst: async (args: any) => {
        if (args.where.languageCode) return null;
        return { sortOrder: 2000 };
      },
      create: async (args: any) => {
        createdData = args.data;
        return { id: createdSentenceId };
      }
    };

    const result = await withDb({ articles, sentences } as Partial<ArrivoDb>, () =>
      createSentence({
        userId: "user-a",
        tenantId: "tenant-a",
        input: {
          articleId,
          sentenceGroupId,
          languageCode: "vi",
          original: "Chúng ta học cùng nhau.",
          translation: "我们一起学习。"
        }
      })
    );

    expect(createdData).toMatchObject({
      articleId,
      sentenceGroupId,
      languageCode: "vi",
      sortOrder: 2000,
      originalContent: "Chúng ta học cùng nhau.",
      translatedContent: "我们一起学习。"
    });
    expect(result.availableLanguages).toEqual([]);
  });

  test("rejects a duplicate language root in the same group", async () => {
    const articles = { findFirst: async () => ({ id: articleId }) };
    const sentences = {
      findFirst: async (args: any) => args.where.languageCode
        ? { id: createdSentenceId }
        : { sortOrder: 2000 }
    };

    await expect(withDb({ articles, sentences } as Partial<ArrivoDb>, () =>
      createSentence({
        userId: "user-a",
        tenantId: "tenant-a",
        input: {
          articleId,
          sentenceGroupId,
          languageCode: "fi",
          original: "Opimme yhdessä.",
          translation: "我们一起学习。"
        }
      })
    )).rejects.toThrow("这个句子已经有该语言内容");
  });

  test("deletes every language tree when a semantic root is deleted", async () => {
    let deletedWhere: any;
    const articles = {
      findFirst: async (args: any) => args.where.id
        ? {
            id: articleId,
            title: "Parallel languages",
            userId: "user-a",
            isPublic: false,
            playCount: 0,
            createdAt: new Date("2026-08-13T00:00:00Z"),
            updatedAt: new Date("2026-08-13T00:00:00Z"),
            Sentences: []
          }
        : null
    };
    const sentences = {
      findFirst: async () => ({
        id: createdSentenceId,
        articleId,
        sentenceGroupId,
        parentSentenceId: null
      }),
      findMany: async () => [],
      updateMany: async (args: any) => {
        deletedWhere = args.where;
        return { count: 4 };
      }
    };

    await withDb({ articles, sentences } as Partial<ArrivoDb>, () =>
      deleteSentence({
        userId: "user-a",
        tenantId: "tenant-a",
        input: { id: createdSentenceId }
      })
    );

    expect(deletedWhere).toMatchObject({ articleId, sentenceGroupId, tenantId: "tenant-a" });
    expect(deletedWhere.id).toBeUndefined();
  });
});
