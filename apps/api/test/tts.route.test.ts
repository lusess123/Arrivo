import { describe, expect, test } from "bun:test";
import { runWithTtsRuntime } from "@arrivo/application";
import type { TtsAssetCache, VoiceClient } from "@arrivo/infra";
import { createApiApp } from "../src/app-factory";
import type { AppEnv } from "../src/context";

const audioBytes = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]).buffer;
const env = {
  JWT_SECRET: "test-secret",
  WEB_ORIGIN: "https://arrivo.example",
  API_BASE_URL: "https://api.arrivo.example"
} as AppEnv["Bindings"];

const assetCache: TtsAssetCache = {
  getAudio: async () => audioBytes,
  getWords: async () => [],
  putAudio: async () => {},
  putWords: async () => {}
};

const voiceClient = {
  listVoices: async () => [],
  synthesize: async () => {
    throw new Error("audio should come from the cache");
  }
} as VoiceClient;

function requestAudio(headers?: HeadersInit) {
  return runWithTtsRuntime({
    assetCache,
    defaultVoice: "en-US-AvaMultilingualNeural",
    voiceClient,
    run: () => createApiApp().request(new Request(
      "http://localhost/api/tts/audio?s=hello&v=en-US-AvaMultilingualNeural",
      { headers },
    ), undefined, env),
  });
}

describe("TTS audio routes", () => {
  test("serves a byte range for browser audio seeking", async () => {
    const response = await requestAudio({ Range: "bytes=2-5" });

    expect(response.status).toBe(206);
    expect(response.headers.get("Accept-Ranges")).toBe("bytes");
    expect(response.headers.get("Content-Range")).toBe("bytes 2-5/8");
    expect(response.headers.get("Content-Length")).toBe("4");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([2, 3, 4, 5]));
  });

  test("rejects a range beyond the audio length", async () => {
    const response = await requestAudio({ Range: "bytes=8-" });

    expect(response.status).toBe(416);
    expect(response.headers.get("Content-Range")).toBe("bytes */8");
  });
});
