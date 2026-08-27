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

describe("sentence visibility routes", () => {
  test("GET returns the authenticated user's saved sentence visibility", async () => {
    const response = await requestWithDb(
      {
        articles: { findFirst: async () => ({ id: articleId }) },
        config: {
          findFirst: async () => ({
            value: JSON.stringify({
              version: 1,
              visibilityBySentenceId: {
                [sentenceId]: { showOriginal: false, showTranslation: true }
              }
            })
          })
        },
        sentences: { findMany: async () => [{ id: sentenceId }] }
      } as Partial<ArrivoDb>,
      new Request(`http://localhost/api/user/articles/${articleId}/sentence-visibility`, {
        headers: { Cookie: await authCookie() }
      })
    );

    expect(response.status).toBe(200);
    expect((await response.json() as any).data).toEqual({
      articleId,
      visibilityBySentenceId: {
        [sentenceId]: { showOriginal: false, showTranslation: true }
      }
    });
  });

  test("PATCH saves both display choices for one sentence", async () => {
    let upsertArgs: any;
    const transactionDb = {
      config: {
        findFirst: async () => null,
        upsert: async (args: any) => {
          upsertArgs = args;
          return {};
        }
      },
      sentences: { findMany: async () => [{ id: sentenceId }] }
    };
    const response = await requestWithDb(
      {
        articles: { findFirst: async () => ({ id: articleId }) },
        sentences: { findFirst: async () => ({ id: sentenceId }) },
        $transaction: async (run: (transaction: typeof transactionDb) => unknown) =>
          run(transactionDb)
      } as Partial<ArrivoDb>,
      new Request(`http://localhost/api/user/articles/${articleId}/sentence-visibility`, {
        method: "PATCH",
        headers: {
          Cookie: await authCookie(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ sentenceId, showOriginal: false, showTranslation: true })
      })
    );

    expect(response.status).toBe(200);
    expect((await response.json() as any).data.visibilityBySentenceId).toEqual({
      [sentenceId]: { showOriginal: false, showTranslation: true }
    });
    expect(upsertArgs.where.tenantId_key.key).toBe(
      `user-sentence-visibility:${user.id}:${articleId}`
    );
  });

  test("PATCH rejects incomplete display choices before accessing the database", async () => {
    const response = await requestWithDb(
      {},
      new Request(`http://localhost/api/user/articles/${articleId}/sentence-visibility`, {
        method: "PATCH",
        headers: {
          Cookie: await authCookie(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ sentenceId, showOriginal: false })
      })
    );

    expect(response.status).toBe(400);
  });
});
