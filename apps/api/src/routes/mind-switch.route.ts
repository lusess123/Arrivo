import { zValidator } from "@hono/zod-validator";
import { changeMindSwitch, readMindSwitch } from "@arrivo/application";
import { mindSwitchChangeSchema, mindSwitchRevisionSchema } from "@arrivo/contracts";
import { HttpError, httpError } from "@arrivo/runtime";
import type { Hono } from "hono";
import type { AppEnv } from "../context";
import { ok } from "../http";
import { requireUser } from "../middleware/auth.middleware";

export function registerMindSwitchRoutes(app: Hono<AppEnv>, prefix = "") {
  const path = `${prefix}/mind-switch`;
  app.use(path, async (c, next) => {
    c.header("Cache-Control", "no-store");
    await next();
  });
  app.use(path, requireUser);

  app.get(path, zValidator("query", mindSwitchRevisionSchema, (result) => {
    if (!result.success) throw httpError.badRequest("同步版本无效");
  }), async (c) => {
    const user = c.get("user");
    if (!user) throw httpError.unauthorized();
    const { revision } = c.req.valid("query");
    return ok(c, {
      accountId: user.id,
      snapshot: await readMindSwitch(user, revision),
    });
  });

  app.post(path, zValidator("json", mindSwitchChangeSchema, (result) => {
    if (!result.success) throw httpError.badRequest("请检查必填内容、长度和日期");
  }), async (c) => {
    const user = c.get("user");
    if (!user) throw httpError.unauthorized();
    const { accountId, change } = c.req.valid("json");
    if (accountId !== user.id) {
      throw new HttpError({
        status: 409,
        code: "ACCOUNT_CHANGED",
        message: "账号已切换，请重新打开页面",
      });
    }
    await changeMindSwitch(user, change);
    return ok(c, null);
  });
}
