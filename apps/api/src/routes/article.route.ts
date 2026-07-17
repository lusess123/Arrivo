import type { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { zValidator } from "@hono/zod-validator";
import {
  articleDetailQuerySchema,
  createArticleInputSchema,
  createSentenceInputSchema,
  deleteArticleInputSchema,
  deleteSentenceInputSchema,
  moveSentenceInputSchema,
  sentenceSplitBatchInputSchema,
  sentenceSplitParamSchema,
  incrementArticlePlayCountInputSchema,
  updateArticleInputSchema,
  updateSentenceInputSchema
} from "@arrivo/contracts";
import {
  createArticle,
  createSentence,
  deleteArticle,
  deleteSentence,
  getArticleDetail,
  getArticleList,
  incrementArticlePlayCount,
  moveSentence,
  analyzeSentenceBatch,
  streamSentenceSplit,
  updateArticle,
  updateSentence
} from "@arrivo/application";
import { createAiGatewayTextClient } from "@arrivo/infra";
import { httpError } from "@arrivo/runtime";
import type { AppEnv } from "../context";
import { ok } from "../http";
import { requireUser } from "../middleware/auth.middleware";

function route(prefix: string, path: string) {
  return `${prefix}${path}`;
}

function getSentenceSplitAi(c: { env: AppEnv["Bindings"] }) {
  const apiKey = c.env.AI_GATEWAY_API_KEY?.trim();
  const baseUrl = c.env.AI_GATEWAY_BASE_URL?.trim();
  const model = c.env.SENTENCE_SPLIT_MODEL?.trim() || "deepseek/deepseek-v4-pro";
  if (!apiKey || !baseUrl) throw httpError.internal("句子切分 AI 尚未配置");
  return { model, ai: createAiGatewayTextClient({ apiKey, baseUrl, model }) };
}

export function registerArticleRoutes(app: Hono<AppEnv>, prefix = "") {
  app.post(
    route(prefix, "/articles/:articleId/sentences/:sentenceId/split-stream"),
    requireUser,
    zValidator("param", sentenceSplitParamSchema),
    async (c) => {
      const user = c.get("user");
      if (!user) throw httpError.unauthorized();
      const { articleId, sentenceId } = c.req.valid("param");
      const { model, ai } = getSentenceSplitAi(c);
      return streamSSE(c, async (stream) => {
        for await (const event of streamSentenceSplit({
          userId: user.id,
          tenantId: user.tenant,
          articleId,
          sentenceId,
          model,
          ai
        })) {
          await stream.writeSSE({ event: event.type, data: JSON.stringify(event) });
        }
      });
    }
  );

  app.post(
    route(prefix, "/articles/sentence-split/analyze-batch"),
    requireUser,
    zValidator("json", sentenceSplitBatchInputSchema),
    async (c) => {
      const user = c.get("user");
      if (!user) throw httpError.unauthorized();
      if (!c.env.AI_BATCH_SECRET || c.req.header("x-ai-batch-secret") !== c.env.AI_BATCH_SECRET) {
        throw httpError.forbidden("批量分析凭证无效");
      }
      const input = c.req.valid("json");
      const { model, ai } = getSentenceSplitAi(c);
      return ok(c, await analyzeSentenceBatch({
        tenantId: user.tenant,
        limit: input.limit,
        retryFailed: input.retryFailed,
        model,
        ai
      }));
    }
  );

  app.get(route(prefix, "/article/getArticleList"), requireUser, async (c) => {
    const user = c.get("user");
    if (!user) throw httpError.unauthorized();
    return ok(c, await getArticleList({ userId: user.id, tenantId: user.tenant }));
  });

  app.get(
    route(prefix, "/article/getArticleDetail"),
    requireUser,
    zValidator("query", articleDetailQuerySchema),
    async (c) => {
      const user = c.get("user");
      if (!user) throw httpError.unauthorized();
      const input = c.req.valid("query");
      const article = await getArticleDetail({ userId: user.id, tenantId: user.tenant, id: input.id });
      if (!article) throw httpError.notFound("文章不存在");
      return ok(c, article);
    }
  );

  app.post(
    route(prefix, "/article/incrementPlayCount"),
    requireUser,
    zValidator("json", incrementArticlePlayCountInputSchema),
    async (c) => {
      const user = c.get("user");
      if (!user) throw httpError.unauthorized();
      const input = c.req.valid("json");
      return ok(c, await incrementArticlePlayCount({ userId: user.id, tenantId: user.tenant, id: input.id }));
    }
  );

  app.post(route(prefix, "/article/createArticle"), requireUser, zValidator("json", createArticleInputSchema), async (c) => {
    const user = c.get("user");
    if (!user) throw httpError.unauthorized();
    const input = c.req.valid("json");
    return ok(c, await createArticle({ userId: user.id, tenantId: user.tenant, input }));
  });

  app.post(route(prefix, "/article/updateArticle"), requireUser, zValidator("json", updateArticleInputSchema), async (c) => {
    const user = c.get("user");
    if (!user) throw httpError.unauthorized();
    const input = c.req.valid("json");
    return ok(c, await updateArticle({ userId: user.id, tenantId: user.tenant, input }));
  });

  app.post(route(prefix, "/article/deleteArticle"), requireUser, zValidator("json", deleteArticleInputSchema), async (c) => {
    const user = c.get("user");
    if (!user) throw httpError.unauthorized();
    const input = c.req.valid("json");
    return ok(c, await deleteArticle({ userId: user.id, tenantId: user.tenant, input }));
  });

  app.post(route(prefix, "/article/createSentence"), requireUser, zValidator("json", createSentenceInputSchema), async (c) => {
    const user = c.get("user");
    if (!user) throw httpError.unauthorized();
    const input = c.req.valid("json");
    return ok(c, await createSentence({ userId: user.id, tenantId: user.tenant, input }));
  });

  app.post(route(prefix, "/article/updateSentence"), requireUser, zValidator("json", updateSentenceInputSchema), async (c) => {
    const user = c.get("user");
    if (!user) throw httpError.unauthorized();
    const input = c.req.valid("json");
    return ok(c, await updateSentence({ userId: user.id, tenantId: user.tenant, input }));
  });

  app.post(route(prefix, "/article/deleteSentence"), requireUser, zValidator("json", deleteSentenceInputSchema), async (c) => {
    const user = c.get("user");
    if (!user) throw httpError.unauthorized();
    const input = c.req.valid("json");
    return ok(c, await deleteSentence({ userId: user.id, tenantId: user.tenant, input }));
  });

  app.post(route(prefix, "/article/moveSentence"), requireUser, zValidator("json", moveSentenceInputSchema), async (c) => {
    const user = c.get("user");
    if (!user) throw httpError.unauthorized();
    const input = c.req.valid("json");
    return ok(c, await moveSentence({ userId: user.id, tenantId: user.tenant, input }));
  });
}
