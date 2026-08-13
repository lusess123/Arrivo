import { describe, expect, test } from "bun:test";
import type { ArrivoDb } from "@arrivo/db";
import { ensureArticleLanguage, parseTranslations, runWithDbClientFactory } from "../src";

const articleId = "019f0000-0000-7000-8000-000000000010";
const groupA = "019f0000-0000-7000-8000-000000000020";
const groupB = "019f0000-0000-7000-8000-000000000030";

function withDb<T>(mockDb: Partial<ArrivoDb>, run: () => T) {
  return runWithDbClientFactory({
    createDb: () => mockDb as ArrivoDb,
    run
  });
}

describe("lazy article language generation", () => {
  test("generates and persists only missing roots while preserving Chinese meanings", async () => {
    let articleLookup = 0;
    let createdData: any[] = [];
    const articles = {
      findFirst: async () => {
        articleLookup += 1;
        if (articleLookup === 1) return { id: articleId };
        if (articleLookup === 2) {
          return {
            id: articleId,
            title: "Parallel learning",
            userId: "user-a",
            isPublic: false,
            playCount: 0,
            createdAt: new Date("2026-08-13T00:00:00Z"),
            updatedAt: new Date("2026-08-13T00:00:00Z"),
            Sentences: []
          };
        }
        return null;
      }
    };
    const sentences = {
      findMany: async () => [
        {
          sentenceGroupId: groupA,
          languageCode: "en",
          originalContent: "We learn together.",
          translatedContent: "我们一起学习。",
          sortOrder: 1000
        },
        {
          sentenceGroupId: groupA,
          languageCode: "fi",
          originalContent: "Opimme yhdessä.",
          translatedContent: "我们一起学习。",
          sortOrder: 1000
        },
        {
          sentenceGroupId: groupB,
          languageCode: "en",
          originalContent: "Practice makes progress.",
          translatedContent: "练习带来进步。",
          sortOrder: 2000
        }
      ],
      createMany: async ({ data }: any) => {
        createdData = data;
        return { count: data.length };
      }
    };
    const ai = {
      streamText: async function* () {},
      generateText: async () => JSON.stringify([
        { sentenceGroupId: groupB, learningContent: "Harjoittelu tuo edistystä." }
      ])
    };

    await withDb({ articles, sentences } as Partial<ArrivoDb>, () =>
      ensureArticleLanguage({
        userId: "user-a",
        tenantId: "tenant-a",
        articleId,
        languageCode: "fi",
        ai
      })
    );

    expect(createdData).toHaveLength(1);
    expect(createdData).toEqual([
      expect.objectContaining({
        sentenceGroupId: groupB,
        languageCode: "fi",
        originalContent: "Harjoittelu tuo edistystä.",
        translatedContent: "练习带来进步。",
        sortOrder: 2000
      })
    ]);
  });

  test("rejects malformed or incomplete model output", () => {
    expect(() => parseTranslations("[]", [groupA])).toThrow("数量不一致");
    expect(() => parseTranslations(JSON.stringify([
      { sentenceGroupId: groupA, learningContent: "" }
    ]), [groupA])).toThrow("不能为空");
  });
});
