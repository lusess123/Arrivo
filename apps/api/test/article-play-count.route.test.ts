import { describe, expect, test } from "bun:test";
import { runWithDbClientFactory } from "@arrivo/application";
import type { AuthUserDto } from "@arrivo/contracts";
import type { ArrivoDb } from "@arrivo/db";
import { signUserJwt } from "@arrivo/runtime";
import { createApiApp } from "../src/app-factory";
import type { AppEnv } from "../src/context";

const env = {
  JWT_SECRET: "test-secret",
  WEB_ORIGIN: "https://arrivo.example",
  API_BASE_URL: "https://api.arrivo.example"
} as AppEnv["Bindings"];
const user: AuthUserDto = {
  id: "019f0000-0000-7000-8000-000000000001",
  name: "Test User",
  role: "user",
  tenant: "tenant-a"
};

async function authCookie() {
  const token = await signUserJwt({ user, secret: env.JWT_SECRET, expiresSeconds: 60 });
  return `Authentication=${token}`;
}

function requestWithDb(mockDb: Partial<ArrivoDb>, request: Request) {
  return runWithDbClientFactory({
    createDb: () => mockDb as ArrivoDb,
    run: () => createApiApp().request(request, undefined, env)
  });
}

describe("article play count route", () => {
  test("increments the play count for an authenticated reader", async () => {
    const response = await requestWithDb(
      {
        articles: {
          findFirst: async () => ({ id: "article-a" }),
          update: async () => ({ playCount: 11 })
        }
      } as Partial<ArrivoDb>,
      new Request("http://localhost/api/article/incrementPlayCount", {
        method: "POST",
        headers: {
          Cookie: await authCookie(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ id: "article-a" })
      })
    );

    expect(response.status).toBe(200);
    expect((await response.json() as any).data).toEqual({ playCount: 11 });
  });

  test("requires authentication", async () => {
    const response = await requestWithDb(
      {},
      new Request("http://localhost/api/article/incrementPlayCount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "article-a" })
      })
    );

    expect(response.status).toBe(401);
  });
});
