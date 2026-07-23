import { describe, expect, test } from "bun:test";
import { runWithDbClientFactory } from "@arrivo/application";
import type { AuthUserDto } from "@arrivo/contracts";
import type { ArrivoDb } from "@arrivo/db";
import { signUserJwt } from "@arrivo/runtime";
import { createApiApp } from "../src/app-factory";
import type { AppEnv } from "../src/context";

const JWT_SECRET = "test-secret";
const env = {
  JWT_SECRET,
  WEB_ORIGIN: "https://arrivo.example",
  API_BASE_URL: "https://api.arrivo.example",
} as AppEnv["Bindings"];
const user: AuthUserDto = {
  id: "019f0000-0000-7000-8000-000000000001",
  name: "Test User",
  role: "user",
  tenant: "tenant-a",
};

async function authCookie() {
  return `Authentication=${await signUserJwt({ user, secret: JWT_SECRET, expiresSeconds: 60 })}`;
}

function requestWithDb(mockDb: Partial<ArrivoDb>, request: Request) {
  return runWithDbClientFactory({
    createDb: () => mockDb as ArrivoDb,
    run: () => createApiApp().request(request, undefined, env),
  });
}

describe("last visited page route", () => {
  test("saves the authenticated user's same-site page", async () => {
    let upsertArgs: any;
    const response = await requestWithDb(
      {
        config: {
          upsert: async (args: any) => {
            upsertArgs = args;
            return {};
          },
        },
      } as Partial<ArrivoDb>,
      new Request("http://localhost/api/user/last-visited-page", {
        method: "PUT",
        headers: {
          Cookie: await authCookie(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: "/article/article-a?tab=notes#sentence-2",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(((await response.json()) as any).data).toBe(
      "/article/article-a?tab=notes#sentence-2",
    );
    expect(upsertArgs.where.tenantId_key).toEqual({
      tenantId: "tenant-a",
      key: `user-last-visited-page:${user.id}`,
    });
  });

  test("rejects an external or login-page redirect before writing", async () => {
    let writes = 0;
    const response = await requestWithDb(
      {
        config: {
          upsert: async () => {
            writes += 1;
            return {};
          },
        },
      } as Partial<ArrivoDb>,
      new Request("http://localhost/api/user/last-visited-page", {
        method: "PUT",
        headers: {
          Cookie: await authCookie(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ path: "https://example.com/phishing" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(writes).toBe(0);
  });
});
