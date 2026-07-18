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
};

type SplitChild = { originalContent: string; translatedContent: string; splittable: boolean };

export type SentenceSplitEvent =
  | { type: "started"; sentenceId: string }
  | { type: "analysis_delta"; text: string }
  | { type: "analysis_completed" }
  | { type: "child_started"; index: number }
  | { type: "original_delta"; index: number; text: string }
  | { type: "translation_delta"; index: number; text: string }
  | { type: "child_completed"; index: number; child: SplitChild }
  | { type: "committed"; parentSentenceId: string; children: Array<Omit<SplitChild, "splittable"> & { id: string; sortOrder: number }> }
  | { type: "failed"; message: string };

const systemPrompt = `你负责把英语学习文章中的长句切成更适合独立朗读的短句。
先给出一句简短的结构分析摘要，再输出子句。不要输出详细思维过程。
不得改写、概括或遗漏英文内容；中英文子句必须一一对应。
严格逐行输出：
ANALYSIS: 一句简短摘要
ORIGINAL: 英文子句
TRANSLATION: 中文子句
SPLITTABLE: true 或 false
END
splittable 表示这个子句是否还能合理拆成至少两个语义完整、适合独立朗读的片段。
除这些行外不要输出任何内容。`;

function splitPrompt(originalContent: string, translatedContent: string) {
  return `英文原句：${originalContent}\n中文释义：${translatedContent}\n请切成至少两个可独立朗读的语义片段。`;
}

function normalizeComparable(text: string) {
  return text.toLocaleLowerCase().replace(/[\p{P}\p{S}\s]/gu, "");
}

export function validateSplitChildren(original: string, children: SplitChild[]) {
  if (children.length < 2) throw new Error("至少需要两个子句");
  if (children.some((child) => !child.originalContent.trim() || !child.translatedContent.trim())) {
    throw new Error("子句的英文和中文不能为空");
  }
  const joined = normalizeComparable(children.map((child) => child.originalContent).join(""));
  if (joined !== normalizeComparable(original)) throw new Error("切分结果遗漏或改写了英文原句");
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

  if (sentence.splitStatus === "SPLIT") {
    const children = await db.sentences.findMany({
      where: { parentSentenceId: sentence.id, ...activeRecordWhere(tenantId) },
      select: { id: true, originalContent: true, translatedContent: true, sortOrder: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }]
    });
    yield {
      type: "committed",
      parentSentenceId: sentence.id,
      children: children.map((child) => ({
        id: child.id,
        originalContent: child.originalContent ?? "",
        translatedContent: child.translatedContent ?? "",
        sortOrder: child.sortOrder
      }))
    };
    return;
  }
  if (sentence.splitStatus === "UNSPLITTABLE") throw httpError.badRequest("这个句子已经不能继续切分");

  const claimed = await db.sentences.updateMany({
    where: { id: sentence.id, splitStatus: { in: ["SPLITTABLE", "FAILED"] }, ...activeRecordWhere(tenantId) },
    data: { splitStatus: "SPLITTING", ...updateRecordBase({ userId: input.userId }) }
  });
  if (claimed.count !== 1) throw httpError.badRequest("这个句子正在切分");

  yield { type: "started", sentenceId: sentence.id };
  const children: SplitChild[] = [];
  let buffer = "";
  let partialKind = "";
  let partialEmitted = 0;
  let currentChild: Partial<SplitChild> | null = null;
  let committed = false;

  try {
    for await (const chunk of input.ai.streamText({
      system: systemPrompt,
      prompt: splitPrompt(sentence.originalContent ?? "", sentence.translatedContent ?? "")
    })) {
      buffer += chunk;
      let newlineIndex = buffer.indexOf("\n");
      while (newlineIndex >= 0) {
        const line = buffer.slice(0, newlineIndex).trimEnd();
        buffer = buffer.slice(newlineIndex + 1);
        if (line.startsWith("ANALYSIS:")) {
          const text = line.slice("ANALYSIS:".length).trimStart();
          if (text.length > partialEmitted) yield { type: "analysis_delta", text: text.slice(partialEmitted) };
          yield { type: "analysis_completed" };
        } else if (line.startsWith("ORIGINAL:")) {
          const text = line.slice("ORIGINAL:".length).trimStart();
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
        } else if (line.trim() === "END") {
          if (
            !currentChild
            || typeof currentChild.originalContent !== "string"
            || typeof currentChild.translatedContent !== "string"
            || typeof currentChild.splittable !== "boolean"
          ) throw new Error("LLM 返回了不完整的子句");
          const child = currentChild as SplitChild;
          children.push(child);
          currentChild = null;
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
    if (buffer.trim() === "END" && currentChild) {
      if (
        typeof currentChild.originalContent !== "string"
        || typeof currentChild.translatedContent !== "string"
        || typeof currentChild.splittable !== "boolean"
      ) throw new Error("LLM 返回了不完整的子句");
      const child = currentChild as SplitChild;
      children.push(child);
      currentChild = null;
      buffer = "";
      yield { type: "child_completed", index: children.length - 1, child };
    }
    if (buffer.trim() || currentChild) throw new Error("LLM 输出在子句完成前中断");
    validateSplitChildren(sentence.originalContent ?? "", children);

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
        sortOrder: child.sortOrder
      }))
    };
  } catch (error) {
    await db.sentences.updateMany({
      where: { id: sentence.id, splitStatus: "SPLITTING", ...activeRecordWhere(tenantId) },
      data: {
        splitStatus: "FAILED",
        splitAnalyzedAt: new Date(),
        splitModel: input.model,
        splitVersion: SPLIT_VERSION,
        ...updateRecordBase({ userId: input.userId })
      }
    });
    const message = error instanceof Error ? error.message : "句子切分失败";
    yield { type: "failed", message };
  } finally {
    if (!committed) {
      await db.sentences.updateMany({
        where: { id: sentence.id, splitStatus: "SPLITTING", ...activeRecordWhere(tenantId) },
        data: {
          splitStatus: "FAILED",
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
    select: { id: true, originalContent: true, translatedContent: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: limit
  });
  let splittable = 0;
  let unsplittable = 0;
  let failed = 0;
  await Promise.all(sentences.map(async (sentence) => {
    try {
      const result = await ai.generateText({
        system: "判断句子能否拆成至少两个仍然语义完整、适合独立朗读的片段。只回答 SPLITTABLE 或 UNSPLITTABLE。",
        prompt: `英文：${sentence.originalContent ?? ""}\n中文：${sentence.translatedContent ?? ""}`
      });
      const decision = result.trim().replace(/[^A-Z_]/g, "");
      if (decision !== "SPLITTABLE" && decision !== "UNSPLITTABLE") {
        throw new Error("LLM 返回了无效的可切分判断");
      }
      const status = decision;
      await db.sentences.update({
        where: { id: sentence.id },
        data: { splitStatus: status, splitAnalyzedAt: new Date(), splitModel: model, splitVersion: SPLIT_VERSION }
      });
      if (status === "SPLITTABLE") splittable += 1;
      else unsplittable += 1;
    } catch {
      failed += 1;
      await db.sentences.update({ where: { id: sentence.id }, data: { splitStatus: "FAILED" } });
    }
  }));
  const remaining = await db.sentences.count({
    where: { splitStatus: { in: statuses }, ...activeRecordWhere(tenantId) }
  });
  return { processed: sentences.length, splittable, unsplittable, failed, remaining, hasMore: remaining > 0 };
}
