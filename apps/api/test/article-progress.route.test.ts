import { describe, expect, test } from "bun:test";
import { runWithDbClientFactory } from "@arrivo/application";
import type { AuthUserDto } from "@arrivo/contracts";
import type { ArrivoDb } from "@arrivo/db";
import { signUserJwt } from "@arrivo/runtime";
import { createApiApp } from "../src/app-factory";
import type { AppEnv } from "../src/context";

const JWT_SECRET = "test-secret";
const articleId = "019f0000-0000-7000-8000-000000000010";
const sentenceId = "019f0000-0000-7000-8000-000000000011";
const env = {
  JWT_SECRET,
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
  const token = await signUserJwt({ user, secret: JWT_SECRET, expiresSeconds: 60 });
  return `Authentication=${token}`;
}

function requestWithDb(mockDb: Partial<ArrivoDb>, request: Request) {
  return runWithDbClientFactory({
    createDb: () => mockDb as ArrivoDb,
    run: () => createApiApp().request(request, undefined, env)
  });
}

describe("article progress routes", () => {
  test("GET returns the saved sentence for the current article", async () => {
    const response = await requestWithDb(
      {
        articles: { findFirst: async () => ({ id: articleId }) },
        sentences: { findMany: async () => [{ id: sentenceId, sortOrder: 2000 }] },
        config: {
          findFirst: async () => ({
            value: JSON.stringify({ sentenceId, sortOrder: 2000 })
          })
        }
      } as Partial<ArrivoDb>,
      new Request(`http://localhost/api/user/article-progress/${articleId}`, {
        headers: { Cookie: await authCookie() }
      })
    );

    expect(response.status).toBe(200);
    expect((await response.json() as any).data).toEqual({ articleId, sentenceId });
  });

  test("PUT saves the current sentence for the authenticated user", async () => {
    let upsertArgs: any;
    const response = await requestWithDb(
      {
        articles: { findFirst: async () => ({ id: articleId }) },
        sentences: { findFirst: async () => ({ id: sentenceId, sortOrder: 2000 }) },
        config: {
          upsert: async (args: any) => {
            upsertArgs = args;
            return {};
          }
        }
      } as Partial<ArrivoDb>,
      new Request(`http://localhost/api/user/article-progress/${articleId}`, {
        method: "PUT",
        headers: {
          Cookie: await authCookie(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ sentenceId })
      })
    );

    expect(response.status).toBe(200);
    expect((await response.json() as any).data).toEqual({ articleId, sentenceId });
    expect(upsertArgs.where.tenantId_key.key).toBe(
      `user-article-progress:${user.id}:${articleId}`
    );
  });

  test("DELETE clears the current article progress", async () => {
    let updateManyArgs: any;
    const response = await requestWithDb(
      {
        config: {
          updateMany: async (args: any) => {
            updateManyArgs = args;
            return { count: 1 };
          }
        }
      } as Partial<ArrivoDb>,
      new Request(`http://localhost/api/user/article-progress/${articleId}`, {
        method: "DELETE",
        headers: { Cookie: await authCookie() }
      })
    );

    expect(response.status).toBe(200);
    expect((await response.json() as any).data).toBeNull();
    expect(updateManyArgs.where.key).toBe(
      `user-article-progress:${user.id}:${articleId}`
    );
  });

  test("requires authentication", async () => {
    const response = await requestWithDb(
      {},
      new Request(`http://localhost/api/user/article-progress/${articleId}`)
    );

    expect(response.status).toBe(401);
  });
});
