import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../context";

export const requestContextMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set("requestId", crypto.randomUUID());
  c.set("requestStartedAtMs", Date.now());
  await next();
};
