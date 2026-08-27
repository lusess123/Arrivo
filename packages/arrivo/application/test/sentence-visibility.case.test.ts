import { describe, expect, test } from "bun:test";
import type { ArrivoDb } from "@arrivo/db";
import {
  getSentenceVisibility,
  runWithDbClientFactory,
  updateSentenceVisibility
} from "../src";

const articleId = "019f0000-0000-7000-8000-000000000010";
const sentenceId = "019f0000-0000-7000-8000-000000000011";
const staleSentenceId = "019f0000-0000-7000-8000-000000000012";

function withDb<T>(mockDb: Partial<ArrivoDb>, run: () => T) {
  return runWithDbClientFactory({
    createDb: () => mockDb as ArrivoDb,
    run
  });
}

describe("sentence visibility", () => {
  test("loads the current user's saved settings and removes missing sentences", async () => {
    const result = await withDb(
      {
        articles: { findFirst: async () => ({ id: articleId }) },
        config: {
          findFirst: async () => ({
            value: JSON.stringify({
              version: 1,
              visibilityBySentenceId: {
                [sentenceId]: { showOriginal: false, showTranslation: true },
                [staleSentenceId]: { showOriginal: true, showTranslation: false }
              }
            })
          })
        },
        sentences: { findMany: async () => [{ id: sentenceId }] }
      } as Partial<ArrivoDb>,
      () =>
        getSentenceVisibility({
          userId: "user-a",
          tenantId: "tenant-a",
          articleId
        })
    );

    expect(result).toEqual({
      articleId,
      visibilityBySentenceId: {
        [sentenceId]: { showOriginal: false, showTranslation: true }
      }
    });
  });

  test("updates one sentence without discarding another saved preference", async () => {
    let upsertArgs: any;
    let transactionOptions: any;
    const otherSentenceId = "019f0000-0000-7000-8000-000000000013";
    const transactionDb = {
      config: {
        findFirst: async () => ({
          value: JSON.stringify({
            version: 1,
            visibilityBySentenceId: {
              [otherSentenceId]: { showOriginal: true, showTranslation: false }
            }
          })
        }),
        upsert: async (args: any) => {
          upsertArgs = args;
          return {};
        }
      },
      sentences: {
        findMany: async () => [{ id: sentenceId }, { id: otherSentenceId }]
      }
    };
    const result = await withDb(
      {
        articles: { findFirst: async () => ({ id: articleId }) },
        sentences: { findFirst: async () => ({ id: sentenceId }) },
        $transaction: async (run: (transaction: typeof transactionDb) => unknown, options: any) => {
          transactionOptions = options;
          return run(transactionDb);
        }
      } as Partial<ArrivoDb>,
      () =>
        updateSentenceVisibility({
          userId: "user-a",
          tenantId: "tenant-a",
          articleId,
          input: { sentenceId, showOriginal: false, showTranslation: true }
        })
    );

    expect(result).toEqual({
      articleId,
      visibilityBySentenceId: {
        [otherSentenceId]: { showOriginal: true, showTranslation: false },
        [sentenceId]: { showOriginal: false, showTranslation: true }
      }
    });
    expect(transactionOptions).toEqual({ isolationLevel: "Serializable" });
    expect(upsertArgs.where).toEqual({
      tenantId_key: {
        tenantId: "tenant-a",
        key: `user-sentence-visibility:user-a:${articleId}`
      }
    });
    expect(JSON.parse(upsertArgs.create.value)).toEqual({
      version: 1,
      visibilityBySentenceId: result.visibilityBySentenceId
    });
  });

  test("retries a serialization conflict before reporting success", async () => {
    let attempts = 0;
    const transactionDb = {
      config: {
        findFirst: async () => null,
        upsert: async () => ({})
      },
      sentences: { findMany: async () => [{ id: sentenceId }] }
    };

    const result = await withDb(
      {
        articles: { findFirst: async () => ({ id: articleId }) },
        sentences: { findFirst: async () => ({ id: sentenceId }) },
        $transaction: async (run: (transaction: typeof transactionDb) => unknown) => {
          attempts += 1;
          if (attempts === 1) throw { code: "P2034" };
          return run(transactionDb);
        }
      } as Partial<ArrivoDb>,
      () =>
        updateSentenceVisibility({
          userId: "user-a",
          tenantId: "tenant-a",
          articleId,
          input: { sentenceId, showOriginal: true, showTranslation: false }
        })
    );

    expect(attempts).toBe(2);
    expect(result.visibilityBySentenceId[sentenceId]).toEqual({
      showOriginal: true,
      showTranslation: false
    });
  });
});
