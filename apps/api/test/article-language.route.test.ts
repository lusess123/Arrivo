import { afterEach, describe, expect, test } from "bun:test";
import { runWithDbClientFactory } from "@arrivo/application";
import type { AuthUserDto } from "@arrivo/contracts";
import type { ArrivoDb } from "@arrivo/db";
import { signUserJwt } from "@arrivo/runtime";
import { createApiApp } from "../src/app-factory";
import type { AppEnv } from "../src/context";

const JWT_SECRET = "test-secret";
const articleId = "019f0000-0000-7000-8000-000000000010";
const groupId = "019f0000-0000-7000-8000-000000000020";
const originalFetch = globalThis.fetch;
const env = {
  JWT_SECRET,
  WEB_ORIGIN: "https://arrivo.example",
  API_BASE_URL: "https://api.arrivo.example",
  AI_GATEWAY_AUTH_TOKEN: "gateway-test-token",
  AI_GATEWAY_BASE_URL: "https://gateway.example",
  SENTENCE_SPLIT_MODEL: "deepseek/test"
} as AppEnv["Bindings"];
const user: AuthUserDto = {
  id: "019f0000-0000-7000-8000-000000000001",
  name: "Test User",
  role: "user",
  tenant: "tenant-a"
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

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

describe("article language routes", () => {
  test("generates a missing language on first use", async () => {
    let createdData: any[] = [];
    let articleLookup = 0;
    globalThis.fetch = async () => new Response(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify([
            { sentenceGroupId: groupId, learningContent: "Chúng ta học cùng nhau." }
          ])
        }
      }]
    }), { headers: { "content-type": "application/json" } });

    const response = await requestWithDb(
      {
        articles: {
          findFirst: async () => {
            articleLookup += 1;
            if (articleLookup === 1) return { id: articleId };
            if (articleLookup === 2) {
              return {
                id: articleId,
                title: "Parallel learning",
                userId: user.id,
                isPublic: false,
                playCount: 0,
                createdAt: new Date("2026-08-13T00:00:00Z"),
                updatedAt: new Date("2026-08-13T00:00:00Z"),
                Sentences: []
              };
            }
            return null;
          }
        },
        sentences: {
          findMany: async () => [{
            sentenceGroupId: groupId,
            languageCode: "en",
            originalContent: "We learn together.",
            translatedContent: "我们一起学习。",
            sortOrder: 1000
          }],
          createMany: async ({ data }: any) => {
            createdData = data;
            return { count: data.length };
          }
        }
      } as Partial<ArrivoDb>,
      new Request(`http://localhost/api/articles/${articleId}/languages/vi/generate`, {
        method: "POST",
        headers: { Cookie: await authCookie() }
      })
    );

    expect(response.status).toBe(200);
    expect(createdData).toEqual([
      expect.objectContaining({
        sentenceGroupId: groupId,
        languageCode: "vi",
        originalContent: "Chúng ta học cùng nhau.",
        translatedContent: "我们一起学习。"
      })
    ]);
  });
});
