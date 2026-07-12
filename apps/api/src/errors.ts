import type { Hono } from "hono";
import { isHttpError } from "@arrivo/runtime";
import type { AppEnv } from "./context";
import { fail } from "./http";

export function registerErrorHandlers(app: Hono<AppEnv>) {
  app.notFound((c) => fail(c, 404, "NOT_FOUND", "接口不存在"));

  app.onError((error, c) => {
    if (isHttpError(error)) {
      return fail(c, error.status, error.code, error.message, error.details);
    }
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    return fail(c, 500, "INTERNAL_ERROR", "服务器错误");
  });
}
