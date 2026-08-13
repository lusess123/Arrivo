import type { AiGatewayTextClient } from "@arrivo/infra";
import { httpError } from "@arrivo/runtime";
import { activeRecordWhere, createRecordBase, normalizeTenantId } from "../runtime/data-scope";
import { db } from "../runtime/db";
import { getArticleDetail } from "./article.case";

type GeneratedTranslation = {
  sentenceGroupId: string;
  learningContent: string;
};

function parseTranslations(text: string, expectedGroupIds: string[]) {
  const json = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(json) as unknown;
  if (!Array.isArray(parsed) || parsed.length !== expectedGroupIds.length) {
    throw new Error("多语言生成结果数量不一致");
  }
  const expected = new Set(expectedGroupIds);
  const translations = new Map<string, GeneratedTranslation>();
  for (const item of parsed) {
    if (!item || typeof item !== "object") throw new Error("多语言生成结果格式无效");
    const { sentenceGroupId, learningContent } = item as Partial<GeneratedTranslation>;
    if (typeof sentenceGroupId !== "string" || !expected.has(sentenceGroupId)) {
      throw new Error("多语言生成结果包含未知句子组");
    }
    if (translations.has(sentenceGroupId)) throw new Error("多语言生成结果包含重复句子组");
    if (typeof learningContent !== "string" || !learningContent.trim()) {
      throw new Error("多语言生成内容不能为空");
    }
    translations.set(sentenceGroupId, {
      sentenceGroupId,
      learningContent: learningContent.trim()
    });
  }
  return translations;
}

export async function ensureArticleLanguage({
  userId,
  tenantId: inputTenantId,
  articleId,
  languageCode,
  ai
}: {
  userId: string;
  tenantId?: string | null;
  articleId: string;
  languageCode: "en" | "vi" | "fi";
  ai: AiGatewayTextClient;
}) {
  const tenantId = normalizeTenantId(inputTenantId);
  const article = await db.articles.findFirst({
    where: {
      id: articleId,
      ...activeRecordWhere(tenantId),
      OR: [{ userId }, { isPublic: true }]
    },
    select: { id: true }
  });
  if (!article) throw httpError.notFound("文章不存在");

  const roots = await db.sentences.findMany({
    where: { articleId, parentSentenceId: null, ...activeRecordWhere(tenantId) },
    select: {
      sentenceGroupId: true,
      languageCode: true,
      originalContent: true,
      translatedContent: true,
      sortOrder: true
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }]
  });
  const existingGroups = new Set(
    roots.filter((root) => root.languageCode === languageCode).map((root) => root.sentenceGroupId)
  );
  const sourceByGroup = new Map(
    roots.filter((root) => root.languageCode === "en")
      .map((root) => [root.sentenceGroupId, root])
  );
  const semanticGroups = new Set(roots.map((root) => root.sentenceGroupId));
  const missingGroupIds = [...semanticGroups].filter((groupId) => !existingGroups.has(groupId));
  const missingSources = [...sourceByGroup.values()]
    .filter((source) => !existingGroups.has(source.sentenceGroupId));

  if (languageCode !== "en" && missingSources.length !== missingGroupIds.length) {
    throw httpError.badRequest("部分句子缺少可用于生成的英语内容");
  }

  if (languageCode !== "en" && missingSources.length) {
    const targetLanguage = languageCode === "vi" ? "越南语" : "芬兰语";
    const translations = parseTranslations(
      await ai.generateText({
        system: `你负责把英语学习材料准确、自然地翻译成${targetLanguage}。保持原句事实、语气和完整含义，不要切分或合并句子。只输出 JSON 数组，不要解释或使用 Markdown。每项格式为 {"sentenceGroupId":"原始ID","learningContent":"${targetLanguage}译文"}。必须原样返回所有 ID，每个 ID 恰好一次。`,
        prompt: JSON.stringify(missingSources.map((source) => ({
          sentenceGroupId: source.sentenceGroupId,
          englishContent: source.originalContent ?? "",
          chineseMeaning: source.translatedContent ?? ""
        })))
      }),
      missingSources.map((source) => source.sentenceGroupId)
    );
    const now = new Date();
    await db.sentences.createMany({
      data: missingSources.map((source) => {
        const translation = translations.get(source.sentenceGroupId)!;
        return {
          ...createRecordBase({ userId, tenantId, now }),
          articleId,
          sentenceGroupId: source.sentenceGroupId,
          languageCode,
          content: translation.learningContent,
          originalContent: translation.learningContent,
          translatedContent: source.translatedContent ?? "",
          sortOrder: source.sortOrder
        };
      }),
      skipDuplicates: true
    });
  }

  const detail = await getArticleDetail({ userId, tenantId, id: articleId });
  if (!detail) throw httpError.notFound("文章不存在");
  return detail;
}

export { parseTranslations };
