import { describe, expect, test } from "bun:test";
import type { ArrivoDb } from "@arrivo/db";
import { runWithDbClientFactory } from "../src/runtime/db";
import { parseBatchSplitDecisions, streamSentenceSplit, validateForcedChildren, validateSplitChildren } from "../src/article/sentence-split.case";

function withDb<T>(mockDb: Partial<ArrivoDb>, run: () => T) {
  return runWithDbClientFactory({ createDb: () => mockDb as ArrivoDb, run });
}

async function runStreamResponse({
  original,
  translated = "译文一。译文二。",
  response,
  chunkSize = 1,
  regenerationFeedback,
  forceSplit
}: {
  original: string;
  translated?: string;
  response: string | string[];
  chunkSize?: number;
  regenerationFeedback?: string;
  forceSplit?: {
    targetCount: 2 | 3 | "auto";
    instruction?: string;
    failedOutput?: string;
    validationError?: string;
  };
}) {
  let createdData: any[] = [];
  const updatedData: any[] = [];
  let system = "";
  let prompt = "";
  let deletedChildren = false;
  let streamCall = 0;
  const sentences = {
    findFirst: async () => ({
      id: "019f0000-0000-7000-8000-000000000030",
      originalContent: original,
      translatedContent: translated,
      splitStatus: regenerationFeedback ? "SPLIT" : forceSplit ? "UNSPLITTABLE" : "SPLITTABLE"
    }),
    findMany: async () => regenerationFeedback ? [
      { originalContent: "Old first.", translatedContent: "旧第一句。", splitStatus: "UNSPLITTABLE" },
      { originalContent: "Old second.", translatedContent: "旧第二句。", splitStatus: "SPLITTABLE" }
    ] : [],
    updateMany: async ({ data }: any) => {
      updatedData.push(data);
      return { count: 1 };
    },
    createMany: async ({ data }: any) => {
      createdData = data;
      return { count: data.length };
    },
    deleteMany: async () => {
      deletedChildren = true;
      return { count: 2 };
    },
    update: async () => ({})
  };
  const mockDb = {
    sentences,
    $transaction: async (operations: Array<Promise<unknown>>) => Promise.all(operations)
  } as Partial<ArrivoDb>;
  const ai = {
    generateText: async () => "",
    async *streamText(input: { system: string; prompt: string }) {
      system = input.system;
      prompt = input.prompt;
      const currentResponse = Array.isArray(response) ? response[Math.min(streamCall++, response.length - 1)] : response;
      for (let index = 0; index < currentResponse.length; index += chunkSize) yield currentResponse.slice(index, index + chunkSize);
    }
  };
  const events = await withDb(mockDb, async () => {
    const collected = [];
    for await (const event of streamSentenceSplit({
      userId: "019f0000-0000-7000-8000-000000000001",
      tenantId: "tenant-a",
      articleId: "019f0000-0000-7000-8000-000000000002",
      sentenceId: "019f0000-0000-7000-8000-000000000030",
      model: "deepseek-chat",
      ai,
      regenerationFeedback,
      forceSplit
    })) collected.push(event);
    return collected;
  });
  return { events, createdData, updatedData, deletedChildren, system, prompt };
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

  test("allows a faithful rewrite for forced splitting and enforces the requested count", () => {
    const children = [
      { originalContent: "I want to thank the American people.", translatedContent: "我想感谢美国人民。", splittable: false },
      { originalContent: "They gave me the extraordinary honor of electing me as your 47th and 45th president.", translatedContent: "他们给予我非凡的荣誉，选举我为你们的第47任和第45任总统。", splittable: false }
    ];
    expect(() => validateForcedChildren(
      "I want to thank the American people for the extraordinary honor of being elected your 47th president and your 45th president.",
      children,
      2
    )).not.toThrow();
    expect(() => validateForcedChildren("One long sentence with important meaning.", children, 3))
      .toThrow("必须生成 3 个子句");
    expect(() => validateForcedChildren(
      "Thank the American people twice.",
      [
        { originalContent: "Thank the American people.", translatedContent: "感谢美国人民。", splittable: false },
        { originalContent: "THANK the American people!", translatedContent: "感谢美国人民！", splittable: false }
      ],
      2
    )).toThrow("重复子句");
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

  test("accepts the real DeepSeek response with one final legacy END", async () => {
    let createdData: any[] = [];
    const original = "Thank you very much. Now winning the popular vote was very nice, very nice. I will tell you, it's a great feeling of love.";
    const sentences = {
      findFirst: async () => ({
        id: "019f0000-0000-7000-8000-000000000020",
        originalContent: original,
        translatedContent: "非常感谢。赢得普选票真的非常好，非常好。我要告诉你们，这是一种伟大的爱的感觉。",
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
    const response = `ANALYSIS: 原句由三个独立句子组成，每句都可独立朗读。

ORIGINAL: Thank you very much.
TRANSLATION: 非常感谢。
SPLITTABLE: false

ORIGINAL: Now winning the popular vote was very nice, very nice.
TRANSLATION: 赢得普选票真的非常好，非常好。
SPLITTABLE: true

ORIGINAL: I will tell you, it's a great feeling of love.
TRANSLATION: 我要告诉你们，这是一种伟大的爱的感觉。
SPLITTABLE: true

END`;
    const ai = {
      generateText: async () => "",
      async *streamText() {
        for (let index = 0; index < response.length; index += 7) yield response.slice(index, index + 7);
      }
    };

    const events = await withDb(mockDb, async () => {
      const collected = [];
      for await (const event of streamSentenceSplit({
        userId: "019f0000-0000-7000-8000-000000000001",
        tenantId: "tenant-a",
        articleId: "019f0000-0000-7000-8000-000000000002",
        sentenceId: "019f0000-0000-7000-8000-000000000020",
        model: "deepseek-chat",
        ai
      })) collected.push(event);
      return collected;
    });

    expect(events.filter((event) => event.type === "child_completed")).toHaveLength(3);
    expect(events.at(-1)?.type).toBe("committed");
    expect(createdData.map((item) => item.originalContent)).toEqual([
      "Thank you very much.",
      "Now winning the popular vote was very nice, very nice.",
      "I will tell you, it's a great feeling of love."
    ]);
  });

  test("accepts END_CHILD and DONE across one-character stream chunks", async () => {
    const result = await runStreamResponse({
      original: "Although it rained, we stayed outside.",
      translated: "尽管下雨了，我们还是待在外面。",
      response: `ANALYSIS: 让步从句和主句。
ORIGINAL: Although it rained,
TRANSLATION: 尽管下雨了，
SPLITTABLE: false
END_CHILD
ORIGINAL: we stayed outside.
TRANSLATION: 我们还是待在外面。
SPLITTABLE: false
END_CHILD
DONE`
    });
    expect(result.events.filter((event) => event.type === "child_completed")).toHaveLength(2);
    expect(result.events.at(-1)?.type).toBe("committed");
    expect(result.system).toContain("每个子句都必须以 END_CHILD 结束");
    expect(result.system).toContain("重复语或不完整从句");
  });

  test("rejects a single unsplit sentence and rewritten English", async () => {
    const single = await runStreamResponse({
      original: "Thank you very much.",
      translated: "非常感谢。",
      response: `ANALYSIS: 无需切分。
ORIGINAL: Thank you very much.
TRANSLATION: 非常感谢。
SPLITTABLE: false
END_CHILD
DONE`
    });
    expect(single.events.at(-1)).toMatchObject({ type: "failed", message: "至少需要两个子句" });
    expect(single.createdData).toHaveLength(0);

    const rewritten = await runStreamResponse({
      original: "We came, and we stayed.",
      response: `ANALYSIS: 并列句。
ORIGINAL: We arrived,
TRANSLATION: 我们来了，
SPLITTABLE: false
END_CHILD
ORIGINAL: and we stayed.
TRANSLATION: 而且我们留下了。
SPLITTABLE: false
END_CHILD
DONE`
    });
    expect(rewritten.events.at(-1)).toMatchObject({ type: "failed", message: "切分结果遗漏或改写了英文原句" });
    expect(rewritten.createdData).toHaveLength(0);
  });

  test("rejects an incomplete child instead of committing partial data", async () => {
    const result = await runStreamResponse({
      original: "First we listen. Then we answer.",
      response: `ANALYSIS: 两个顺序动作。
ORIGINAL: First we listen.
TRANSLATION: 首先我们倾听。
SPLITTABLE: false
END_CHILD
ORIGINAL: Then we answer.
TRANSLATION: 然后我们回答。
END_CHILD
DONE`
    });
    expect(result.events.at(-1)).toMatchObject({ type: "failed", message: "LLM 返回了不完整的子句" });
    expect(result.createdData).toHaveLength(0);
  });

  test("marks the real prepositional-phrase example as unsplittable", async () => {
    const original = "I want to thank the American people for the extraordinary honor of being elected your 47th president and your 45th president.";
    const result = await runStreamResponse({
      original,
      translated: "我想感谢美国人民赋予我这个非凡的荣誉，成为你们的第47任总统和第45任总统。",
      response: `ANALYSIS: 后半部分是依赖主句的介词短语，不能独立朗读。
RESULT: UNSPLITTABLE
DONE`
    });
    expect(result.events.at(-1)).toEqual({
      type: "unsplittable",
      sentenceId: "019f0000-0000-7000-8000-000000000030"
    });
    expect(result.createdData).toHaveLength(0);
    expect(result.updatedData.some((data) => data.splitStatus === "UNSPLITTABLE")).toBe(true);
    expect(result.system).toContain("绝对不要再次输出输入的完整原句");
  });

  test("rejects a response that repeats the parent before its children", async () => {
    const original = "I want to thank the American people for the extraordinary honor of being elected your 47th president and your 45th president.";
    const result = await runStreamResponse({
      original,
      response: `ANALYSIS: 错误地同时输出父句和子句。
RESULT: SPLIT
ORIGINAL: ${original}
TRANSLATION: 完整父句。
SPLITTABLE: false
END_CHILD
ORIGINAL: I want to thank the American people.
TRANSLATION: 我想感谢美国人民。
SPLITTABLE: false
END_CHILD
ORIGINAL: For the extraordinary honor of being elected your 47th president and your 45th president.
TRANSLATION: 为了这个非凡的荣誉。
SPLITTABLE: false
END_CHILD
DONE`
    });
    expect(result.events.at(-1)).toMatchObject({ type: "failed", message: "切分结果遗漏或改写了英文原句" });
    expect(result.createdData).toHaveLength(0);
  });

  test("regenerates with the old result and error judgment before replacing children", async () => {
    const result = await runStreamResponse({
      original: "First sentence. Second sentence.",
      translated: "第一句。第二句。",
      regenerationFeedback: "旧结果重复了父句，第二段不能独立朗读。",
      response: `ANALYSIS: 修正旧结果。
RESULT: SPLIT
ORIGINAL: First sentence.
TRANSLATION: 第一句。
SPLITTABLE: false
END_CHILD
ORIGINAL: Second sentence.
TRANSLATION: 第二句。
SPLITTABLE: false
END_CHILD
DONE`
    });
    expect(result.prompt).toContain("上一次错误结果");
    expect(result.prompt).toContain("Old first.");
    expect(result.prompt).toContain("错误判断：旧结果重复了父句，第二段不能独立朗读。");
    expect(result.deletedChildren).toBe(true);
    expect(result.createdData).toHaveLength(2);
    expect(result.events.at(-1)?.type).toBe("committed");
  });

  test("force splits an unsplittable sentence with a separate rewrite prompt", async () => {
    const result = await runStreamResponse({
      original: "I want to thank the American people for the extraordinary honor they gave me.",
      translated: "我想感谢美国人民给予我的非凡荣誉。",
      forceSplit: {
        targetCount: 2,
        instruction: "每句尽量简短",
        failedOutput: "两个子句完全相同",
        validationError: "强制切分生成了重复子句"
      },
      response: `ANALYSIS: 补充代词后改写为两个完整句子。
RESULT: SPLIT
ORIGINAL: I want to thank the American people.
TRANSLATION: 我想感谢美国人民。
SPLITTABLE: false
END_CHILD
ORIGINAL: They gave me an extraordinary honor.
TRANSLATION: 他们给予了我非凡的荣誉。
SPLITTABLE: false
END_CHILD
DONE`
    });
    expect(result.system).toContain("允许调整语序、补充必要主语");
    expect(result.prompt).toContain("恰好 2 个完整短句");
    expect(result.prompt).toContain("额外要求：每句尽量简短");
    expect(result.prompt).toContain("上一次错误输出：两个子句完全相同");
    expect(result.prompt).toContain("上一次校验错误：强制切分生成了重复子句");
    expect(result.createdData).toHaveLength(2);
    expect(result.events.at(-1)?.type).toBe("committed");
  });

  test("automatically retries once when forced splitting returns duplicate children", async () => {
    const duplicate = `ANALYSIS: 错误结果。
RESULT: SPLIT
ORIGINAL: We keep the important meaning.
TRANSLATION: 我们保留重要含义。
SPLITTABLE: false
END_CHILD
ORIGINAL: We keep the important meaning!
TRANSLATION: 我们保留重要含义！
SPLITTABLE: false
END_CHILD
DONE`;
    const corrected = `ANALYSIS: 修正重复结果。
RESULT: SPLIT
ORIGINAL: We keep the important meaning.
TRANSLATION: 我们保留重要含义。
SPLITTABLE: false
END_CHILD
ORIGINAL: The sentence becomes easier to read.
TRANSLATION: 这个句子变得更容易朗读。
SPLITTABLE: false
END_CHILD
DONE`;
    const result = await runStreamResponse({
      original: "We keep the important meaning and the sentence becomes easier to read.",
      translated: "我们保留重要含义，并让句子更容易朗读。",
      forceSplit: { targetCount: "auto" },
      response: [duplicate, corrected]
    });
    expect(result.events.some((event) => event.type === "retrying")).toBe(true);
    expect(result.events.at(-1)?.type).toBe("committed");
    expect(result.createdData.map((item) => item.originalContent)).toEqual([
      "We keep the important meaning.",
      "The sentence becomes easier to read."
    ]);
  });
});
