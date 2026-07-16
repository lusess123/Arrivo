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

describe("playback settings routes", () => {
  test("GET /api/user/playback-settings returns the current user's setting", async () => {
    let where: any;
    const config = {
      findFirst: async (args: any) => {
        where = args.where;
        return {
          value: JSON.stringify({
            voice: "en-GB-SoniaNeural",
            playbackRate: 1.25,
            repeatCount: 2,
            extraPauseSeconds: 1
          })
        };
      }
    };
    const response = await requestWithDb(
      { config } as Partial<ArrivoDb>,
      new Request("http://localhost/api/user/playback-settings", {
        headers: { Cookie: await authCookie() }
      })
    );

    expect(response.status).toBe(200);
    expect((await response.json() as any).data).toEqual({
      voice: "en-GB-SoniaNeural",
      playbackRate: 1.25,
      repeatCount: 2,
      extraPauseSeconds: 1
    });
    expect(where).toEqual({
      tenantId: "tenant-a",
      deletedAt: null,
      key: `user-playback-settings:${user.id}`
    });
  });

  test("PUT rejects an invalid half-second pause before writing", async () => {
    let writes = 0;
    const config = {
      upsert: async () => {
        writes += 1;
        return {};
      }
    };
    const response = await requestWithDb(
      { config } as Partial<ArrivoDb>,
      new Request("http://localhost/api/user/playback-settings", {
        method: "PUT",
        headers: {
          Cookie: await authCookie(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          voice: "en-AU-NatashaNeural",
          playbackRate: 1,
          repeatCount: 1,
          extraPauseSeconds: 0.25
        })
      })
    );

    expect(response.status).toBe(400);
    expect(writes).toBe(0);
  });

  test("PUT rejects an unsupported voice before writing", async () => {
    let writes = 0;
    const config = {
      upsert: async () => {
        writes += 1;
        return {};
      }
    };
    const response = await requestWithDb(
      { config } as Partial<ArrivoDb>,
      new Request("http://localhost/api/user/playback-settings", {
        method: "PUT",
        headers: {
          Cookie: await authCookie(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          voice: "not-a-real-voice",
          playbackRate: 1,
          repeatCount: 1,
          extraPauseSeconds: 0
        })
      })
    );

    expect(response.status).toBe(400);
    expect(writes).toBe(0);
  });

  test("PUT saves settings under the authenticated user's key", async () => {
    let upsertArgs: any;
    const config = {
      upsert: async (args: any) => {
        upsertArgs = args;
        return {};
      }
    };
    const input = {
      voice: "en-GB-RyanNeural",
      playbackRate: 1.5,
      repeatCount: 3,
      extraPauseSeconds: 2.5
    };
    const response = await requestWithDb(
      { config } as Partial<ArrivoDb>,
      new Request("http://localhost/api/user/playback-settings", {
        method: "PUT",
        headers: {
          Cookie: await authCookie(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      })
    );

    expect(response.status).toBe(200);
    expect((await response.json() as any).data).toEqual(input);
    expect(upsertArgs.where).toEqual({
      tenantId_key: {
        tenantId: "tenant-a",
        key: `user-playback-settings:${user.id}`
      }
    });
  });

  test("requires authentication", async () => {
    const response = await requestWithDb(
      {},
      new Request("http://localhost/api/user/playback-settings")
    );

    expect(response.status).toBe(401);
  });
});
