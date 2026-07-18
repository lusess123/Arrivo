import { describe, expect, test } from "bun:test";
import type { ArrivoDb } from "@arrivo/db";
import { runWithDbClientFactory } from "../src/runtime/db";
import { parseBatchSplitDecisions, streamSentenceSplit, validateSplitChildren } from "../src/article/sentence-split.case";

function withDb<T>(mockDb: Partial<ArrivoDb>, run: () => T) {
  return runWithDbClientFactory({ createDb: () => mockDb as ArrivoDb, run });
}

describe("sentence split validation", () => {
  test("validates one complete batch of sentence decisions", () => {
    const decisions = parseBatchSplitDecisions(
      JSON.stringify([
        { id: "sentence-a", splittable: true },
        { id: "sentence-b", splittable: false }
      ]),
      ["sentence-a", "sentence-b"]
    );
    expect([...decisions]).toEqual([["sentence-a", true], ["sentence-b", false]]);
  });

  test("rejects incomplete, duplicate, or unknown batch decisions", () => {
    expect(() => parseBatchSplitDecisions('[{"id":"sentence-a","splittable":true}]', ["sentence-a", "sentence-b"]))
      .toThrow("数量不一致");
    expect(() => parseBatchSplitDecisions('[{"id":"sentence-a","splittable":true},{"id":"sentence-a","splittable":false}]', ["sentence-a", "sentence-b"]))
      .toThrow("重复 ID");
  });

  test("accepts aligned children that preserve the English sentence", () => {
    expect(() => validateSplitChildren(
      "When we stop looking outside, we begin to understand ourselves.",
      [
        { originalContent: "When we stop looking outside,", translatedContent: "当我们不再向外寻找时，", splittable: false },
        { originalContent: "we begin to understand ourselves.", translatedContent: "我们开始理解自己。", splittable: false }
      ]
    )).not.toThrow();
  });

  test("rejects missing or rewritten English content", () => {
    expect(() => validateSplitChildren(
      "One, two, three.",
      [
        { originalContent: "One,", translatedContent: "一，", splittable: false },
        { originalContent: "three.", translatedContent: "三。", splittable: false }
      ]
    )).toThrow("遗漏或改写");
  });

  test("requires at least two bilingual children", () => {
    expect(() => validateSplitChildren(
      "One sentence.",
      [{ originalContent: "One sentence.", translatedContent: "一句话。", splittable: false }]
    )).toThrow("至少需要两个子句");
  });

  test("streams child text deltas and commits child split decisions", async () => {
    let createdData: any[] = [];
    const sentences = {
      findFirst: async () => ({
        id: "019f0000-0000-7000-8000-000000000010",
        originalContent: "One, two.",
        translatedContent: "一，二。",
        splitStatus: "SPLITTABLE"
      }),
      updateMany: async () => ({ count: 1 }),
      createMany: async ({ data }: any) => {
        createdData = data;
        return { count: data.length };
      },
      update: async () => ({})
    };
    const mockDb = {
      sentences,
      $transaction: async (operations: Array<Promise<unknown>>) => Promise.all(operations)
    } as Partial<ArrivoDb>;
    const ai = {
      generateText: async () => "",
      async *streamText() {
        yield "ANALYSIS: 两个并列项\nORIG";
        yield "INAL: One,\nTRANSLATION: 一，\nSPLITTABLE: false\nEND\n";
        yield "ORIGINAL: two.\nTRANSLATION: 二。\nSPLITTABLE: false\nEND";
      }
    };

    const events = await withDb(mockDb, async () => {
      const collected = [];
      for await (const event of streamSentenceSplit({
        userId: "019f0000-0000-7000-8000-000000000001",
        tenantId: "tenant-a",
        articleId: "019f0000-0000-7000-8000-000000000002",
        sentenceId: "019f0000-0000-7000-8000-000000000010",
        model: "deepseek/test",
        ai
      })) collected.push(event);
      return collected;
    });

    expect(events.filter((event) => event.type === "child_started")).toHaveLength(2);
    expect(events.filter((event) => event.type === "original_delta").map((event: any) => event.text).join(""))
      .toBe("One,two.");
    expect(events.at(-1)?.type).toBe("committed");
    expect(createdData.map((item) => item.splitStatus)).toEqual(["UNSPLITTABLE", "UNSPLITTABLE"]);
  });
});
