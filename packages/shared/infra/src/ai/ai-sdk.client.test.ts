import { describe, expect, test } from "bun:test";
import { createAiSdkTextClient, createMockAiClient } from "./ai-sdk.client";

describe("createAiSdkTextClient", () => {
  test("uses fallback text when no model is resolved", async () => {
    const client = createAiSdkTextClient({
      resolveModel: () => null,
      fallbackText: (input) => `fallback:${input.prompt}`,
      fallbackChunkSize: 4,
      fallbackDelayMs: 0
    });

    const chunks: string[] = [];
    for await (const chunk of client.streamText?.({ prompt: "hello world" }) ?? []) {
      chunks.push(chunk);
    }

    expect(await client.generateText({ prompt: "hello" })).toBe("fallback:hello");
    expect(chunks).toEqual(["fall", "back", ":hel", "lo w", "orld"]);
  });

  test("accepts structured messages when no model is resolved", async () => {
    const client = createAiSdkTextClient({
      resolveModel: () => null,
      fallbackText: (input) => ("messages" in input ? input.messages.at(-1)?.content ?? "" : input.prompt),
      fallbackChunkSize: 3,
      fallbackDelayMs: 0
    });

    const chunks: string[] = [];
    for await (const chunk of client.streamText?.({
      messages: [
        { role: "user", content: "hi" },
        { role: "assistant", content: "hello" }
      ]
    }) ?? []) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(["hel", "lo"]);
  });

  test("throws when structured messages are empty", async () => {
    const client = createAiSdkTextClient({
      resolveModel: () => null,
      fallbackText: () => "fallback"
    });

    await expect(client.generateText({ messages: [] })).rejects.toThrow("at least one message");
  });
});

describe("createMockAiClient", () => {
  test("returns the same fallback text for normal and streaming calls", async () => {
    const client = createMockAiClient({
      fallbackText: () => "abcdef",
      chunkSize: 2,
      delayMs: 0
    });

    const chunks: string[] = [];
    for await (const chunk of client.streamText?.({ prompt: "ignored" }) ?? []) {
      chunks.push(chunk);
    }

    expect(await client.generateText({ prompt: "ignored" })).toBe("abcdef");
    expect(chunks).toEqual(["ab", "cd", "ef"]);
  });
});
