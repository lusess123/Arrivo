import { describe, expect, test } from "bun:test";
import type { ArrivoDb } from "@arrivo/db";
import {
  getPlaybackSettings,
  runWithDbClientFactory,
  updatePlaybackSettings
} from "../src";

function withDb<T>(mockDb: Partial<ArrivoDb>, run: () => T) {
  return runWithDbClientFactory({
    createDb: () => mockDb as ArrivoDb,
    run
  });
}

describe("playback settings", () => {
  test("loads settings by tenant and user and returns defaults when missing", async () => {
    const calls: any[] = [];
    const config = {
      findFirst: async (args: any) => {
        calls.push(args);
        if (args.where.key.endsWith("user-a")) {
          return {
            value: JSON.stringify({
              voice: "en-GB-SoniaNeural",
              playbackRate: 1.25,
              repeatCount: 3,
              extraPauseSeconds: 1.5
            })
          };
        }
        return null;
      }
    };

    const [userA, userB] = await withDb({ config } as Partial<ArrivoDb>, async () => Promise.all([
      getPlaybackSettings({ userId: "user-a", tenantId: "tenant-a" }),
      getPlaybackSettings({ userId: "user-b", tenantId: "tenant-a" })
    ]));

    expect(userA).toEqual({
      voice: "en-GB-SoniaNeural",
      playbackRate: 1.25,
      repeatCount: 3,
      extraPauseSeconds: 1.5
    });
    expect(userB).toEqual({
      voice: "en-AU-NatashaNeural",
      playbackRate: 1,
      repeatCount: 1,
      extraPauseSeconds: 0
    });
    expect(calls.map((call) => call.where)).toEqual([
      { tenantId: "tenant-a", deletedAt: null, key: "user-playback-settings:user-a" },
      { tenantId: "tenant-a", deletedAt: null, key: "user-playback-settings:user-b" }
    ]);
  });

  test("falls back safely when stored JSON is malformed", async () => {
    const config = {
      findFirst: async () => ({ value: "not-json" })
    };

    const result = await withDb({ config } as Partial<ArrivoDb>, () =>
      getPlaybackSettings({ userId: "user-a", tenantId: "tenant-a" })
    );

    expect(result).toEqual({
      voice: "en-AU-NatashaNeural",
      playbackRate: 1,
      repeatCount: 1,
      extraPauseSeconds: 0
    });
  });

  test("upserts only the current user's tenant-scoped config with audit fields", async () => {
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
      repeatCount: 4,
      extraPauseSeconds: 2.5
    };

    const result = await withDb({ config } as Partial<ArrivoDb>, () =>
      updatePlaybackSettings({ userId: "user-a", tenantId: "tenant-a", input })
    );

    expect(result).toEqual(input);
    expect(upsertArgs.where).toEqual({
      tenantId_key: {
        tenantId: "tenant-a",
        key: "user-playback-settings:user-a"
      }
    });
    expect(JSON.parse(upsertArgs.create.value)).toEqual(input);
    expect(upsertArgs.create.tenantId).toBe("tenant-a");
    expect(upsertArgs.create.createdBy).toBe("user-a");
    expect(upsertArgs.create.updatedBy).toBe("user-a");
    expect(upsertArgs.update.updatedBy).toBe("user-a");
    expect(upsertArgs.update.deletedAt).toBeNull();
  });
});
