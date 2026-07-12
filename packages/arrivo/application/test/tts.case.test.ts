import { describe, expect, test } from "bun:test";
import type { TtsAssetCache, VoiceClient } from "@arrivo/infra";
import { getAudio, runWithTtsRuntime } from "../src";

describe("getAudio", () => {
  test("regenerates an old cached MP3 when its word timeline is missing", async () => {
    const oldAudio = new Uint8Array([1]).buffer;
    const newAudio = new Uint8Array([2]).buffer;
    const saved: string[] = [];
    const assetCache: TtsAssetCache = {
      getAudio: async () => oldAudio,
      getWords: async () => undefined,
      putAudio: async ({ key }) => { saved.push(key); },
      putWords: async ({ key }) => { saved.push(key); }
    };
    const voiceClient: VoiceClient = {
      listVoices: async () => [],
      synthesize: async () => ({
        audio: newAudio,
        words: [{ text: "Hello", offsetMs: 0, durationMs: 300 }]
      })
    };

    const result = await runWithTtsRuntime({
      assetCache,
      defaultVoice: "en-US-AndrewNeural",
      voiceClient,
      run: () => getAudio({ text: "Hello" })
    });

    expect(result.body).toBe(newAudio);
    expect(result.fromCache).toBe(false);
    expect(saved).toHaveLength(2);
    expect(saved.some(key => key.endsWith(".mp3"))).toBe(true);
    expect(saved.some(key => key.endsWith(".words.json"))).toBe(true);
  });
});
