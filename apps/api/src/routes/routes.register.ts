import type { Hono } from "hono";
import { checkDatabaseHealth } from "@arrivo/application";
import type { AppEnv } from "../context";
import { ok } from "../http";
import { registerAuthRoutes } from "./auth.route";
import { registerArticleRoutes } from "./article.route";
import { registerMddRoutes } from "./mdd.route";
import { registerTtsRoutes } from "./tts.route";
import { registerUserRoutes } from "./user.route";

export function registerRoutes(app: Hono<AppEnv>) {
  app.get("/", (c) => ok(c, { name: "arrivo-api", ok: true }));
  app.get("/health", (c) => ok(c, { ok: true }));
  app.get("/health/db", async (c) => {
    return ok(c, await checkDatabaseHealth());
  });
  app.get("/api", (c) => ok(c, { name: "arrivo-api", ok: true }));
  app.get("/api/health", (c) => ok(c, { ok: true }));
  app.get("/api/health/db", async (c) => {
    return ok(c, await checkDatabaseHealth());
  });
  for (const prefix of ["", "/api"]) {
    registerAuthRoutes(app, prefix);
    registerArticleRoutes(app, prefix);
    registerMddRoutes(app, prefix);
    registerTtsRoutes(app, prefix);
    registerUserRoutes(app, prefix);
  }
}
