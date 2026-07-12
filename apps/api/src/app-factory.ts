import { Hono } from "hono";
import type { AppEnv } from "./context";
import { registerApiMiddleware } from "./middleware/api.middleware";
import { registerErrorHandlers } from "./errors";
import { registerRoutes } from "./routes/routes.register";

export function createApiApp() {
  const app = new Hono<AppEnv>();
  registerApiMiddleware(app);
  registerRoutes(app);
  registerErrorHandlers(app);
  return app;
}
