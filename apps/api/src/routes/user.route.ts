import { zValidator } from "@hono/zod-validator";
import {
  clearArticleProgress,
  getArticleProgress,
  getPlaybackSettings,
  saveArticleProgress,
  updatePlaybackSettings
} from "@arrivo/application";
import {
  articleProgressArticleParamSchema,
  articleProgressSentenceInputSchema,
  playbackSettingsInputSchema
} from "@arrivo/contracts";
import { httpError } from "@arrivo/runtime";
import type { Hono } from "hono";
import type { AppEnv } from "../context";
import { ok } from "../http";
import { requireUser } from "../middleware/auth.middleware";

function route(prefix: string, path: string) {
  return `${prefix}${path}`;
}

export function registerUserRoutes(app: Hono<AppEnv>, prefix = "") {
  app.get(
    route(prefix, "/user/article-progress/:articleId"),
    requireUser,
    zValidator("param", articleProgressArticleParamSchema),
    async (c) => {
      const user = c.get("user");
      if (!user) throw httpError.unauthorized();
      const { articleId } = c.req.valid("param");
      return ok(c, await getArticleProgress({ userId: user.id, tenantId: user.tenant, articleId }));
    }
  );

  app.put(
    route(prefix, "/user/article-progress/:articleId"),
    requireUser,
    zValidator("param", articleProgressArticleParamSchema),
    zValidator("json", articleProgressSentenceInputSchema),
    async (c) => {
      const user = c.get("user");
      if (!user) throw httpError.unauthorized();
      const { articleId } = c.req.valid("param");
      const input = c.req.valid("json");
      return ok(c, await saveArticleProgress({
        userId: user.id,
        tenantId: user.tenant,
        input: { articleId, sentenceId: input.sentenceId }
      }));
    }
  );

  app.delete(
    route(prefix, "/user/article-progress/:articleId"),
    requireUser,
    zValidator("param", articleProgressArticleParamSchema),
    async (c) => {
      const user = c.get("user");
      if (!user) throw httpError.unauthorized();
      const { articleId } = c.req.valid("param");
      await clearArticleProgress({ userId: user.id, tenantId: user.tenant, articleId });
      return ok(c, null);
    }
  );

  app.get(route(prefix, "/user/playback-settings"), requireUser, async (c) => {
    const user = c.get("user");
    if (!user) throw httpError.unauthorized();
    return ok(c, await getPlaybackSettings({ userId: user.id, tenantId: user.tenant }));
  });

  app.put(
    route(prefix, "/user/playback-settings"),
    requireUser,
    zValidator("json", playbackSettingsInputSchema),
    async (c) => {
      const user = c.get("user");
      if (!user) throw httpError.unauthorized();
      const input = c.req.valid("json");
      return ok(c, await updatePlaybackSettings({ userId: user.id, tenantId: user.tenant, input }));
    }
  );
}
