import type { AiGatewayTextClient } from "@arrivo/infra";
import { httpError } from "@arrivo/runtime";
import { activeRecordWhere, createRecordBase, normalizeTenantId, updateRecordBase } from "../runtime/data-scope";
import { db } from "../runtime/db";

const SPLIT_VERSION = "20260718-v1";
const ORDER_STEP = 1000;

type SplitDeps = {
  userId: string;
  tenantId?: string | null;
  articleId: string;
  sentenceId: string;
  model: string;
  ai: AiGatewayTextClient;
  regenerationFeedback?: string;
  forceSplit?: {
    targetCount: 2 | 3 | "auto";
    instruction?: string;
    failedOutput?: string;
    validationError?: string;
  };
  retryCount?: number;
};

type SplitChild = { originalContent: string; translatedContent: string; splittable: boolean };

export type SentenceSplitEvent =
  | { type: "started"; sentenceId: string }
  | { type: "retrying"; message: string }
  | { type: "analysis_delta"; text: string }
  | { type: "analysis_completed" }
  | { type: "child_started"; index: number }
  | { type: "original_delta"; index: number; text: string }
  | { type: "translation_delta"; index: number; text: string }
  | { type: "child_completed"; index: number; child: SplitChild }
  | { type: "unsplittable"; sentenceId: string }
  | { type: "committed"; parentSentenceId: string; children: Array<SplitChild & { id: string; sortOrder: number }> }
  | { type: "failed"; message: string; failedOutput: string; validationError: string };

const systemPrompt = `你负责把英语学习文章中的长句切成更适合独立朗读的短句。
先给出一句简短的结构分析摘要，再输出子句。不要输出详细思维过程。
不得改写、概括或遗漏英文内容；中英文子句必须一一对应。
严格逐行输出：
ANALYSIS: 一句简短摘要
RESULT: SPLIT 或 UNSPLITTABLE
如果 RESULT 是 UNSPLITTABLE，下一行直接输出 DONE，不要输出任何子句。
如果 RESULT 是 SPLIT，只输出切分后的直接子句，绝对不要再次输出输入的完整原句：
ORIGINAL: 英文子句
TRANSLATION: 中文子句
SPLITTABLE: true 或 false
END_CHILD
每个子句都必须以 END_CHILD 结束；全部子句输出后，单独输出一行 DONE。
所有 ORIGINAL 按顺序拼接后必须与输入英文完全一致，不得增加、删除、重复或改写单词。
无法产生至少两个合格子句时，必须返回 RESULT: UNSPLITTABLE。
splittable 只有在拆分后的每一部分都能脱离上下文独立理解和朗读时才为 true。
判断每个输出子句的 splittable 时，必须对该子句重新应用完全相同的切分标准；只有它还能产生至少两个合格子句才为 true。
短简单句（例如 “Thank you very much.”）以及仅包含重复表达、但不能形成两个完整子句的句子，必须为 false。
切分后的每个英文子句至少应有 5 个单词和两个有实际含义的核心词；不要为了切分而产生过短、学习价值很低的片段。
除祈使句、感叹句等本身完整的表达外，每个子句必须有自己的主语和限定谓语。
禁止把介词短语、不定式短语、分词结构、连接词、话语标记、重复语或不完整从句单独切出。
例如 “I want to thank the American people for the extraordinary honor ...” 不能切成 “I want to thank the American people” 和 “for the extraordinary honor ...”，因为后者是依赖主句的介词短语；应返回 RESULT: UNSPLITTABLE。
除这些行外不要输出任何内容。`;

const forceSystemPrompt = `你负责把英语学习文章中的长句改写成更适合独立朗读的多个短句。
先输出一句简短结构摘要，再只输出改写后的子句。不要输出详细思维过程。
允许调整语序、补充必要主语和连接方式，但核心单词、人物、数字、事实、语气和完整含义必须保持不变，不得增加新事实。
所有子句必须表达不同的内容，禁止输出两个相同或仅大小写、空格、标点不同的英文或中文子句。
每个英文子句至少应有 5 个单词和两个有实际含义的核心词，禁止生成过短、信息不足的片段。
每个英文子句都必须语法完整、可脱离其他子句独立理解和朗读；中文必须逐句对应。
SPLITTABLE 必须按“不改写原文、只在原有边界切分”的普通标准判断；只有还能产生至少两个完整子句时才为 true，不能依赖再次改写。
严格逐行输出：
ANALYSIS: 一句简短摘要
RESULT: SPLIT
ORIGINAL: 英文子句
TRANSLATION: 中文子句
SPLITTABLE: true 或 false
END_CHILD
每个子句以 END_CHILD 结束，最后单独输出 DONE。不要输出原句作为子句，也不要输出其他内容。`;

function splitPrompt(
  originalContent: string,
  translatedContent: string,
  regeneration?: { feedback: string; previousChildren: SplitChild[] }
) {
  const base = `英文原句：${originalContent}\n中文释义：${translatedContent}`;
  if (!regeneration) return `${base}\n请切成至少两个可独立朗读的语义片段。`;
  return `${base}
上一次错误结果：${JSON.stringify(regeneration.previousChildren)}
错误判断：${regeneration.feedback}
请根据错误判断重新生成，避免重复旧结果中的问题。`;
}

function forcePrompt(originalContent: string, translatedContent: string, force: NonNullable<SplitDeps["forceSplit"]>) {
  const count = force.targetCount === "auto" ? "自动决定两个或多个" : `恰好 ${force.targetCount} 个`;
  return `英文原句：${originalContent}\n中文释义：${translatedContent}\n请改写成${count}完整短句。${force.instruction ? `\n额外要求：${force.instruction}` : ""}${force.failedOutput ? `\n上一次错误输出：${force.failedOutput}` : ""}${force.validationError ? `\n上一次校验错误：${force.validationError}\n请修正该错误，不要重复上一次的问题。` : ""}`;
}

function normalizeComparable(text: string) {
  return text.toLocaleLowerCase().replace(/[\p{P}\p{S}\s]/gu, "");
}

const functionWords = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "but", "by", "for", "from", "had", "has", "have",
  "he", "her", "him", "his", "i", "in", "is", "it", "its", "me", "my", "of", "on", "or", "our", "she",
  "so", "that", "the", "their", "them", "they", "this", "to", "us", "was", "we", "were", "will", "with", "you", "your"
]);

function validateUsefulChildren(children: SplitChild[]) {
  for (const child of children) {
    const words = child.originalContent.toLocaleLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || [];
    const contentWords = words.filter((word) => word.length > 2 && !functionWords.has(word));
    if (words.length < 5 || new Set(contentWords).size < 2) {
      throw new Error(`子句过短或缺少有效内容：${child.originalContent}`);
    }
  }
}

export function validateSplitChildren(original: string, children: SplitChild[]) {
  if (children.length < 2) throw new Error("至少需要两个子句");
  if (children.some((child) => !child.originalContent.trim() || !child.translatedContent.trim())) {
    throw new Error("子句的英文和中文不能为空");
  }
  const joined = normalizeComparable(children.map((child) => child.originalContent).join(""));
  if (joined !== normalizeComparable(original)) throw new Error("切分结果遗漏或改写了英文原句");
  validateUsefulChildren(children);
}

export function validateForcedChildren(original: string, children: SplitChild[], targetCount: 2 | 3 | "auto") {
  if (children.length < 2) throw new Error("强制切分至少需要两个子句");
  if (targetCount !== "auto" && children.length !== targetCount) throw new Error(`强制切分必须生成 ${targetCount} 个子句`);
  if (children.some((child) => !child.originalContent.trim() || !child.translatedContent.trim())) {
    throw new Error("子句的英文和中文不能为空");
  }
  const normalizedOriginals = children.map((child) => normalizeComparable(child.originalContent));
  const normalizedTranslations = children.map((child) => normalizeComparable(child.translatedContent));
  if (new Set(normalizedOriginals).size !== children.length || new Set(normalizedTranslations).size !== children.length) {
    throw new Error("强制切分生成了重复子句");
  }
  validateUsefulChildren(children);
  const sourceTokens = original.toLocaleLowerCase().match(/[a-z]+|\d+/g) || [];
  const outputTokens = new Set(children.flatMap((child) => child.originalContent.toLocaleLowerCase().match(/[a-z]+|\d+/g) || []));
  const important = sourceTokens.filter((token) => token.length >= 4 || /^\d+$/.test(token));
  const retained = important.filter((token) => outputTokens.has(token)).length;
  if (important.length && retained / important.length < 0.7) throw new Error("强制切分改动了过多核心单词");
}

export async function* streamSentenceSplit(input: SplitDeps): AsyncGenerator<SentenceSplitEvent> {
  const tenantId = normalizeTenantId(input.tenantId);
  const sentence = await db.sentences.findFirst({
    where: {
      id: input.sentenceId,
      articleId: input.articleId,
      ...activeRecordWhere(tenantId),
      article: { is: { ...activeRecordWhere(tenantId), OR: [{ userId: input.userId }, { isPublic: true }] } }
    },
    select: { id: true, originalContent: true, translatedContent: true, splitStatus: true }
  });
  if (!sentence) throw httpError.notFound("句子不存在");

  const isRegeneration = Boolean(input.regenerationFeedback);
  const isForced = Boolean(input.forceSplit);
  if (isRegeneration && isForced) throw httpError.badRequest("不能同时纠错和强制切分");
  const previousChildren = isRegeneration
    ? await db.sentences.findMany({
      where: { parentSentenceId: sentence.id, ...activeRecordWhere(tenantId) },
      select: { originalContent: true, translatedContent: true, splitStatus: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }]
    })
    : [];

  if (sentence.splitStatus === "SPLIT" && !isRegeneration && !isForced) {
    const children = await db.sentences.findMany({
      where: { parentSentenceId: sentence.id, ...activeRecordWhere(tenantId) },
      select: { id: true, originalContent: true, translatedContent: true, sortOrder: true, splitStatus: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }]
    });
    yield {
      type: "committed",
      parentSentenceId: sentence.id,
      children: children.map((child) => ({
        id: child.id,
        originalContent: child.originalContent ?? "",
        translatedContent: child.translatedContent ?? "",
        splittable: child.splitStatus === "SPLITTABLE",
        sortOrder: child.sortOrder
      }))
    };
    return;
  }
  if (isRegeneration && sentence.splitStatus !== "SPLIT") throw httpError.badRequest("只有已切分句子可以重新生成");
  if (sentence.splitStatus === "UNSPLITTABLE" && !isForced) throw httpError.badRequest("这个句子已经不能继续切分");

  const claimed = await db.sentences.updateMany({
    where: {
      id: sentence.id,
      splitStatus: { in: isRegeneration ? ["SPLIT"] : isForced ? ["UNKNOWN", "SPLITTABLE", "UNSPLITTABLE", "FAILED"] : ["SPLITTABLE", "FAILED"] },
      ...activeRecordWhere(tenantId)
    },
    data: { splitStatus: "SPLITTING", ...updateRecordBase({ userId: input.userId }) }
  });
  if (claimed.count !== 1) throw httpError.badRequest("这个句子正在切分");

  yield { type: "started", sentenceId: sentence.id };
  const children: SplitChild[] = [];
  let buffer = "";
  let partialKind = "";
  let partialEmitted = 0;
  let currentChild: Partial<SplitChild> | null = null;
  let splitResult: "SPLIT" | "UNSPLITTABLE" | null = null;
  let committed = false;
  let rawOutput = "";

  function completeCurrentChild() {
    if (
      !currentChild
      || typeof currentChild.originalContent !== "string"
      || typeof currentChild.translatedContent !== "string"
      || typeof currentChild.splittable !== "boolean"
    ) throw new Error("LLM 返回了不完整的子句");
    const child = currentChild as SplitChild;
    children.push(child);
    currentChild = null;
    return child;
  }

  try {
    for await (const chunk of input.ai.streamText({
      system: isForced ? forceSystemPrompt : systemPrompt,
      prompt: isForced ? forcePrompt(
        sentence.originalContent ?? "",
        sentence.translatedContent ?? "",
        input.forceSplit!
      ) : splitPrompt(
        sentence.originalContent ?? "",
        sentence.translatedContent ?? "",
        isRegeneration ? {
          feedback: input.regenerationFeedback!,
          previousChildren: previousChildren.map((child) => ({
            originalContent: child.originalContent ?? "",
            translatedContent: child.translatedContent ?? "",
            splittable: child.splitStatus === "SPLITTABLE"
          }))
        } : undefined
      )
    })) {
      rawOutput += chunk;
      buffer += chunk;
      let newlineIndex = buffer.indexOf("\n");
      while (newlineIndex >= 0) {
        const line = buffer.slice(0, newlineIndex).trimEnd();
        buffer = buffer.slice(newlineIndex + 1);
        if (line.startsWith("ANALYSIS:")) {
          const text = line.slice("ANALYSIS:".length).trimStart();
          if (text.length > partialEmitted) yield { type: "analysis_delta", text: text.slice(partialEmitted) };
          yield { type: "analysis_completed" };
        } else if (line.startsWith("RESULT:")) {
          const value = line.slice("RESULT:".length).trim().toUpperCase();
          if (value !== "SPLIT" && value !== "UNSPLITTABLE") throw new Error("LLM 返回了无效的切分结果");
          splitResult = value;
        } else if (line.startsWith("ORIGINAL:")) {
          if (splitResult === "UNSPLITTABLE") throw new Error("不可切分结果不应包含子句");
          splitResult ??= "SPLIT";
          const text = line.slice("ORIGINAL:".length).trimStart();
          if (partialKind !== "ORIGINAL" && currentChild) {
            const child = completeCurrentChild();
            yield { type: "child_completed", index: children.length - 1, child };
          }
          if (!currentChild) currentChild = {};
          currentChild.originalContent = text;
          if (partialKind !== "ORIGINAL") yield { type: "child_started", index: children.length };
          if (text.length > partialEmitted) yield { type: "original_delta", index: children.length, text: text.slice(partialEmitted) };
        } else if (line.startsWith("TRANSLATION:")) {
          const text = line.slice("TRANSLATION:".length).trimStart();
          if (!currentChild) currentChild = {};
          currentChild.translatedContent = text;
          if (text.length > partialEmitted) yield { type: "translation_delta", index: children.length, text: text.slice(partialEmitted) };
        } else if (line.startsWith("SPLITTABLE:")) {
          if (!currentChild) currentChild = {};
          const value = line.slice("SPLITTABLE:".length).trim().toLowerCase();
          if (value !== "true" && value !== "false") throw new Error("子句可切分判断无效");
          currentChild.splittable = value === "true";
        } else if (line.trim() === "END_CHILD" || line.trim() === "END") {
          const child = completeCurrentChild();
          yield { type: "child_completed", index: children.length - 1, child };
        } else if (line.trim() === "DONE" && currentChild) {
          const child = completeCurrentChild();
          yield { type: "child_completed", index: children.length - 1, child };
        }
        partialKind = "";
        partialEmitted = 0;
        newlineIndex = buffer.indexOf("\n");
      }

      const prefixes = ["ANALYSIS:", "ORIGINAL:", "TRANSLATION:"] as const;
      const prefix = prefixes.find((candidate) => buffer.startsWith(candidate));
      if (prefix) {
        const kind = prefix.slice(0, -1);
        const text = buffer.slice(prefix.length).trimStart();
        if (partialKind !== kind) {
          partialKind = kind;
          partialEmitted = 0;
          if (kind === "ORIGINAL") {
            if (splitResult === "UNSPLITTABLE") throw new Error("不可切分结果不应包含子句");
            splitResult ??= "SPLIT";
            if (currentChild) {
              const child = completeCurrentChild();
              yield { type: "child_completed", index: children.length - 1, child };
            }
            currentChild = {};
            yield { type: "child_started", index: children.length };
          }
        }
        const delta = text.slice(partialEmitted);
        if (delta) {
          if (kind === "ANALYSIS") yield { type: "analysis_delta", text: delta };
          if (kind === "ORIGINAL") {
            if (!currentChild) currentChild = {};
            currentChild.originalContent = text;
            yield { type: "original_delta", index: children.length, text: delta };
          }
          if (kind === "TRANSLATION") {
            if (!currentChild) currentChild = {};
            currentChild.translatedContent = text;
            yield { type: "translation_delta", index: children.length, text: delta };
          }
          partialEmitted = text.length;
        }
      }
    }
    if (["END_CHILD", "END", "DONE"].includes(buffer.trim()) && currentChild) {
      const child = completeCurrentChild();
      buffer = "";
      yield { type: "child_completed", index: children.length - 1, child };
    }
    if (buffer.trim() === "DONE") buffer = "";
    if (buffer.trim() || currentChild) throw new Error("LLM 输出在子句完成前中断");
    if (splitResult === "UNSPLITTABLE") {
      if (isForced) throw new Error("强制切分必须生成至少两个完整短句");
      if (children.length > 0) throw new Error("不可切分结果不应包含子句");
      if ((input.retryCount ?? 0) < 1) {
        await db.sentences.updateMany({
          where: { id: sentence.id, splitStatus: "SPLITTING", ...activeRecordWhere(tenantId) },
          data: { splitStatus: sentence.splitStatus, ...updateRecordBase({ userId: input.userId }) }
        });
        yield { type: "retrying", message: "无法直接切分，正在自动调整表达" };
        yield* streamSentenceSplit({
          ...input,
          regenerationFeedback: undefined,
          retryCount: (input.retryCount ?? 0) + 1,
          forceSplit: {
            targetCount: "auto",
            failedOutput: rawOutput.slice(-12000),
            validationError: "原句无法在不改写的情况下产生两个有效短句",
            instruction: "在保持核心单词、事实和原意的前提下，改写成两个或多个长度适中的完整句子。"
          }
        });
        return;
      }
      const now = new Date();
      const updateParent = db.sentences.updateMany({
        where: { id: sentence.id, splitStatus: "SPLITTING", ...activeRecordWhere(tenantId) },
        data: {
          splitStatus: "UNSPLITTABLE",
          splitAnalyzedAt: now,
          splitModel: input.model,
          splitVersion: SPLIT_VERSION,
          ...updateRecordBase({ userId: input.userId, now })
        }
      });
      if (isRegeneration) {
        await db.$transaction([
          db.sentences.deleteMany({ where: { parentSentenceId: sentence.id, ...activeRecordWhere(tenantId) } }),
          updateParent
        ]);
      } else {
        await updateParent;
      }
      committed = true;
      yield { type: "unsplittable", sentenceId: sentence.id };
      return;
    }
    if (isForced) validateForcedChildren(sentence.originalContent ?? "", children, input.forceSplit!.targetCount);
    else validateSplitChildren(sentence.originalContent ?? "", children);

    const now = new Date();
    const created = children.map((child, index) => ({
      ...createRecordBase({ userId: input.userId, tenantId, now }),
      articleId: input.articleId,
      parentSentenceId: sentence.id,
      content: child.originalContent,
      originalContent: child.originalContent,
        translatedContent: child.translatedContent,
        splitStatus: child.splittable ? "SPLITTABLE" : "UNSPLITTABLE",
        splitAnalyzedAt: now,
        splitModel: input.model,
        splitVersion: SPLIT_VERSION,
        sortOrder: (index + 1) * ORDER_STEP
    }));
    await db.$transaction([
      ...(isRegeneration
        ? [db.sentences.deleteMany({ where: { parentSentenceId: sentence.id, ...activeRecordWhere(tenantId) } })]
        : []),
      db.sentences.createMany({ data: created }),
      db.sentences.update({
        where: { id: sentence.id },
        data: {
          splitStatus: "SPLIT",
          splitAnalyzedAt: now,
          splitModel: input.model,
          splitVersion: SPLIT_VERSION,
          ...updateRecordBase({ userId: input.userId, now })
        }
      })
    ]);
    committed = true;
    yield {
      type: "committed",
      parentSentenceId: sentence.id,
      children: created.map((child) => ({
        id: child.id,
        originalContent: child.originalContent,
        translatedContent: child.translatedContent,
        splittable: child.splitStatus === "SPLITTABLE",
        sortOrder: child.sortOrder
      }))
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "句子切分失败";
    await db.sentences.updateMany({
      where: { id: sentence.id, splitStatus: "SPLITTING", ...activeRecordWhere(tenantId) },
      data: {
        splitStatus: isRegeneration ? "SPLIT" : isForced ? sentence.splitStatus : "FAILED",
        splitAnalyzedAt: new Date(),
        splitModel: input.model,
        splitVersion: SPLIT_VERSION,
        ...updateRecordBase({ userId: input.userId })
      }
    });
    const shouldRetry = message.includes("重复子句") || message.includes("子句过短");
    if (shouldRetry && (input.retryCount ?? 0) < 1) {
      yield { type: "retrying", message: "切分结果不合格，正在自动调整后重新生成" };
      yield* streamSentenceSplit({
        ...input,
        regenerationFeedback: undefined,
        retryCount: (input.retryCount ?? 0) + 1,
        forceSplit: {
          targetCount: input.forceSplit?.targetCount ?? "auto",
          failedOutput: rawOutput.slice(-12000),
          validationError: message,
          instruction: [input.forceSplit?.instruction, "修正上一次结果：每个子句必须内容不同、至少 5 个单词并包含足够有效信息。"]
            .filter(Boolean)
            .join("\n")
        }
      });
      return;
    }
    yield {
      type: "failed",
      message,
      failedOutput: rawOutput.slice(-12000),
      validationError: message
    };
  } finally {
    if (!committed) {
      await db.sentences.updateMany({
        where: { id: sentence.id, splitStatus: "SPLITTING", ...activeRecordWhere(tenantId) },
        data: {
          splitStatus: isRegeneration ? "SPLIT" : isForced ? sentence.splitStatus : "FAILED",
          splitAnalyzedAt: new Date(),
          splitModel: input.model,
          splitVersion: SPLIT_VERSION,
          ...updateRecordBase({ userId: input.userId })
        }
      });
    }
  }
}

export async function analyzeSentenceBatch({
  tenantId: inputTenantId,
  limit,
  retryFailed,
  model,
  ai
}: {
  tenantId?: string | null;
  limit: number;
  retryFailed: boolean;
  model: string;
  ai: AiGatewayTextClient;
}) {
  const tenantId = normalizeTenantId(inputTenantId);
  const statuses = retryFailed ? ["UNKNOWN", "FAILED"] : ["UNKNOWN"];
  const sentences = await db.sentences.findMany({
    where: { splitStatus: { in: statuses }, ...activeRecordWhere(tenantId) },
    select: { id: true, originalContent: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: limit
  });
  if (sentences.length === 0) {
    return { processed: 0, splittable: 0, unsplittable: 0, failed: 0, remaining: 0, hasMore: false };
  }

  const result = await ai.generateText({
    system: `判断每个英文句子能否拆成至少两个仍然语义完整、适合独立朗读的片段，并且每个片段至少有 5 个英文单词和两个有实际含义的核心词。
只输出 JSON 数组，不要解释或使用 Markdown。每项格式为 {"id":"原始 ID","splittable":true}。
必须原样返回所有 ID，每个 ID 恰好出现一次。`,
    prompt: JSON.stringify(sentences.map((sentence) => ({
      id: sentence.id,
      originalContent: sentence.originalContent ?? ""
    })))
  });
  const decisions = parseBatchSplitDecisions(result, sentences.map((sentence) => sentence.id));
  const now = new Date();
  const idsByStatus = { SPLITTABLE: [] as string[], UNSPLITTABLE: [] as string[] };
  for (const [id, splittable] of decisions) {
    idsByStatus[splittable ? "SPLITTABLE" : "UNSPLITTABLE"].push(id);
  }
  const allIds = [...decisions.keys()];
  const idParams = allIds.map((_, index) => `$${index + 1}::uuid`).join(", ");
  const splittableIndexes = new Set(idsByStatus.SPLITTABLE.map((id) => allIds.indexOf(id) + 1));
  const splittableCondition = splittableIndexes.size > 0
    ? `"id" IN (${[...splittableIndexes].map((index) => `$${index}::uuid`).join(", ")})`
    : "FALSE";
  const nowIndex = allIds.length + 1;
  const modelIndex = nowIndex + 1;
  const versionIndex = modelIndex + 1;
  const tenantIndex = versionIndex + 1;
  const allowedStatuses = retryFailed ? "'UNKNOWN', 'FAILED'" : "'UNKNOWN'";
  await db.$executeRawUnsafe(
    `UPDATE "Sentences"
     SET "splitStatus" = CASE WHEN ${splittableCondition} THEN 'SPLITTABLE' ELSE 'UNSPLITTABLE' END,
         "splitAnalyzedAt" = $${nowIndex}, "splitModel" = $${modelIndex},
         "splitVersion" = $${versionIndex}, "updatedAt" = $${nowIndex}
     WHERE "id" IN (${idParams}) AND "splitStatus" IN (${allowedStatuses})
       AND "tenantId" = $${tenantIndex} AND "deletedAt" IS NULL`,
    ...allIds, now, model, SPLIT_VERSION, tenantId
  );
  const splittable = [...decisions.values()].filter(Boolean).length;
  const unsplittable = decisions.size - splittable;
  const remaining = await db.sentences.count({
    where: { splitStatus: { in: statuses }, ...activeRecordWhere(tenantId) }
  });
  return { processed: sentences.length, splittable, unsplittable, failed: 0, remaining, hasMore: remaining > 0 };
}

export function parseBatchSplitDecisions(text: string, expectedIds: string[]) {
  const parsed = JSON.parse(text.trim()) as unknown;
  if (!Array.isArray(parsed)) throw new Error("LLM 批量判断不是 JSON 数组");
  if (parsed.length !== expectedIds.length) throw new Error("LLM 批量判断数量不一致");

  const expected = new Set(expectedIds);
  const decisions = new Map<string, boolean>();
  for (const item of parsed) {
    if (!item || typeof item !== "object") throw new Error("LLM 批量判断格式无效");
    const { id, splittable } = item as { id?: unknown; splittable?: unknown };
    if (typeof id !== "string" || !expected.has(id)) throw new Error("LLM 批量判断包含未知 ID");
    if (decisions.has(id)) throw new Error("LLM 批量判断包含重复 ID");
    if (typeof splittable !== "boolean") throw new Error("LLM 批量判断结果不是布尔值");
    decisions.set(id, splittable);
  }
  if (decisions.size !== expected.size) throw new Error("LLM 批量判断缺少 ID");
  return decisions;
}
