import { zValidator } from "@hono/zod-validator";
import { getPlaybackSettings, updatePlaybackSettings } from "@arrivo/application";
import { playbackSettingsInputSchema } from "@arrivo/contracts";
import { httpError } from "@arrivo/runtime";
import type { Hono } from "hono";
import type { AppEnv } from "../context";
import { ok } from "../http";
import { requireUser } from "../middleware/auth.middleware";

function route(prefix: string, path: string) {
  return `${prefix}${path}`;
}

export function registerUserRoutes(app: Hono<AppEnv>, prefix = "") {
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
