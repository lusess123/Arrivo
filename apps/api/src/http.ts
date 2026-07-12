import type { Context } from "hono";
import type { AppEnv } from "./context";

export function ok<T>(c: Context<AppEnv>, data: T, init?: ResponseInit) {
  const startedAtMs = c.get("requestStartedAtMs") || Date.now();
  return c.json(
    {
      statusCode: init?.status ?? 200,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startedAtMs,
      requestId: c.get("requestId") || "unknown",
      data
    },
    init as never
  );
}

export function fail(
  c: Context<AppEnv>,
  status: number,
  code: string,
  message: string,
  data?: unknown
) {
  return c.json(
    {
      statusCode: status,
      timestamp: new Date().toISOString(),
      requestId: c.get("requestId") || "unknown",
      code,
      message,
      data
    },
    status as never
  );
}
