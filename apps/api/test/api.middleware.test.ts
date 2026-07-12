import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import type { AppEnv } from "../src/context";
import { registerApiMiddleware } from "../src/middleware/api.middleware";

const env = {
  WEB_ORIGIN: "https://arrivo.zyking.xyz",
  LEGACY_WEB_ORIGIN: "https://app-arrivo.zyking.xyz",
  MANAGE_ORIGIN: "https://manage-arrivo.zyking.xyz"
} as AppEnv["Bindings"];

function createApp() {
  const app = new Hono<AppEnv>();
  registerApiMiddleware(app);
  app.get("/test", (c) => c.text("ok"));
  return app;
}

describe("API CORS", () => {
  test.each([
    "https://arrivo.zyking.xyz",
    "https://app-arrivo.zyking.xyz"
  ])("allows configured web origin %s", async (origin) => {
    const response = await createApp().request("http://localhost/test", {
      headers: { Origin: origin }
    }, env);

    expect(response.headers.get("access-control-allow-origin")).toBe(origin);
    expect(response.headers.get("access-control-allow-credentials")).toBe("true");
  });

  test("does not reflect an unknown origin", async () => {
    const response = await createApp().request("http://localhost/test", {
      headers: { Origin: "https://example.com" }
    }, env);

    expect(response.headers.get("access-control-allow-origin")).toBe(env.WEB_ORIGIN);
  });
});
