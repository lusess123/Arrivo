import type { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { bodyLimit } from "hono/body-limit";
import { httpError } from "@arrivo/runtime";
import type { AppEnv } from "../context";
import { requestContextMiddleware } from "./request-context.middleware";

function getOrigins(env: AppEnv["Bindings"]) {
  return [env.WEB_ORIGIN, env.MANAGE_ORIGIN].filter(Boolean) as string[];
}

function isHealthPath(pathname: string) {
  return pathname === "/health" ||
    pathname === "/api/health" ||
    pathname.startsWith("/health/") ||
    pathname.startsWith("/api/health/");
}

export function registerApiMiddleware(app: Hono<AppEnv>) {
  app.use(
    "*",
    cors({
      origin: (origin, c) => {
        if (!origin) return c.env.WEB_ORIGIN;
        return getOrigins(c.env).includes(origin) ? origin : c.env.WEB_ORIGIN;
      },
      credentials: true
    })
  );
  app.use("*", secureHeaders({ crossOriginResourcePolicy: "cross-origin" }));
  app.use("*", bodyLimit({ maxSize: 8 * 1024 * 1024 }));
  app.use("*", logger());
  app.use("*", requestContextMiddleware);
  app.use("*", async (c, next) => {
    const origin = c.req.header("origin");
    const pathname = new URL(c.req.url).pathname;

    if (origin && c.env.MANAGE_ORIGIN && origin === c.env.MANAGE_ORIGIN && !isHealthPath(pathname)) {
      throw httpError.forbidden("管理后台暂未开放");
    }

    await next();
  });
}
