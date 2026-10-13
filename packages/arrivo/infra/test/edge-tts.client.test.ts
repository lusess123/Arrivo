import { afterEach, describe, expect, test } from "bun:test";
import { listEdgeVoices, parseEdgeWordBoundaries, synthesizeWithEdge } from "../src/edge-tts.client";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("Edge TTS client", () => {
  test("uses the current synthesis endpoint and returns audio with word boundaries", async () => {
    let requestUrl: URL | undefined;
    let requestHeaders: Headers | undefined;
    let accepted = false;
    let closed = false;
    const messages: string[] = [];
    const audioHeader = new TextEncoder().encode("Path:audio\r\nContent-Type:audio/mpeg\r\n");
    const audioFrame = new Uint8Array(2 + audioHeader.length + 3);
    audioFrame[0] = audioHeader.length >> 8;
    audioFrame[1] = audioHeader.length & 0xff;
    audioFrame.set(audioHeader, 2);
    audioFrame.set([1, 2, 3], 2 + audioHeader.length);

    const socket = Object.assign(new EventTarget(), {
      binaryType: "",
      accept() {
        accepted = true;
      },
      close() {
        closed = true;
      },
      send(message: string) {
        messages.push(message);
        if (!message.includes("Path:ssml")) return;
        queueMicrotask(() => {
          socket.dispatchEvent(new MessageEvent("message", {
            data: `Path:audio.metadata\r\n\r\n${JSON.stringify({
              Metadata: [{
                Type: "WordBoundary",
                Data: {
                  Offset: 5_000_000,
                  Duration: 2_500_000,
                  text: { Text: "Hello" }
                }
              }]
            })}`
          }));
          socket.dispatchEvent(new MessageEvent("message", { data: audioFrame.buffer }));
          queueMicrotask(() => {
            socket.dispatchEvent(new MessageEvent("message", { data: "Path:turn.end\r\n\r\n" }));
          });
        });
      }
    });
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requestUrl = new URL(String(input));
      requestHeaders = new Headers(init?.headers);
      return Object.assign(new Response(null), { webSocket: socket });
    }) as typeof fetch;

    const result = await synthesizeWithEdge({ text: "Hello & welcome", voice: "en-US-AriaNeural" });

    expect(requestUrl?.origin).toBe("https://api.msedgeservices.com");
    expect(requestUrl?.pathname).toBe("/tts/cognitiveservices/websocket/v1");
    expect(requestUrl?.searchParams.get("Ocp-Apim-Subscription-Key")).toBe("6A5AA1D4EAFF4E9FB37E23D68491D6F4");
    expect(requestUrl?.searchParams.has("TrustedClientToken")).toBe(false);
    expect(requestHeaders?.get("Upgrade")).toBe("websocket");
    expect(accepted).toBe(true);
    expect(closed).toBe(true);
    expect(socket.binaryType).toBe("arraybuffer");
    expect(messages).toHaveLength(2);
    expect(messages[0]).toContain("Path:speech.config");
    expect(messages[0]).toContain('"wordBoundaryEnabled":"true"');
    expect(messages[1]).toContain("Path:ssml");
    expect(messages[1]).toContain("Hello &amp; welcome");
    expect(new Uint8Array(result.audio)).toEqual(new Uint8Array([1, 2, 3]));
    expect(result.words).toEqual([{ text: "Hello", offsetMs: 500, durationMs: 250 }]);
  });

  test("keeps the voice list on its existing endpoint", async () => {
    let requestUrl: URL | undefined;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      requestUrl = new URL(String(input));
      return new Response(JSON.stringify([
        { ShortName: "en-US-AriaNeural", Locale: "en-US", FriendlyName: "Aria" },
        { ShortName: "zh-CN-XiaoxiaoNeural", Locale: "zh-CN", FriendlyName: "Xiaoxiao" }
      ]));
    }) as typeof fetch;

    const voices = await listEdgeVoices("en");

    expect(requestUrl?.origin).toBe("https://speech.platform.bing.com");
    expect(requestUrl?.pathname).toBe("/consumer/speech/synthesize/readaloud/voices/list");
    expect(requestUrl?.searchParams.get("TrustedClientToken")).toBe("6A5AA1D4EAFF4E9FB37E23D68491D6F4");
    expect(requestUrl?.searchParams.has("Ocp-Apim-Subscription-Key")).toBe(false);
    expect(voices).toEqual([{ name: "en-US-AriaNeural", locale: "en-US", displayName: "Aria" }]);
  });
});

describe("parseEdgeWordBoundaries", () => {
  test("converts Edge ticks to milliseconds and decodes text", () => {
    const words = parseEdgeWordBoundaries(JSON.stringify({
      Metadata: [
        {
          Type: "WordBoundary",
          Data: {
            Offset: 5_000_000,
            Duration: 2_500_000,
            text: { Text: "Arrivo" }
          }
        },
        {
          Type: "WordBoundary",
          Data: {
            Offset: 7_500_000,
            Duration: 1_000_000,
            text: { Text: "Tom &amp; Jerry" }
          }
        },
        { Type: "SessionEnd", Data: {} }
      ]
    }));

    expect(words).toEqual([
      { text: "Arrivo", offsetMs: 500, durationMs: 250 },
      { text: "Tom & Jerry", offsetMs: 750, durationMs: 100 }
    ]);
  });
});
