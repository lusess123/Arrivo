import { afterEach, describe, expect, jest, test } from "bun:test";
import { createAiGatewayTextClient } from "../src/ai-gateway.client";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  jest.useRealTimers();
});

describe("AI gateway text client", () => {
  test("keeps an extra-long multilingual sentence split alive beyond 180 seconds", async () => {
    jest.useFakeTimers();
    let requestSignal: AbortSignal | undefined;
    let resolveFetch!: (response: Response) => void;
    globalThis.fetch = ((_: RequestInfo | URL, init?: RequestInit) => {
      requestSignal = init?.signal as AbortSignal | undefined;
      return new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      });
    }) as typeof fetch;

    const pending = createAiGatewayTextClient({
      gatewayToken: "test-token",
      baseUrl: "https://gateway.example",
      model: "test-model"
    }).generateText({ system: "split", prompt: "one long Finnish sentence" });
    await Promise.resolve();

    jest.advanceTimersByTime(180_000);
    expect(requestSignal?.aborted).toBe(false);

    resolveFetch(new Response(JSON.stringify({
      choices: [{ message: { content: "done" } }]
    }), { headers: { "content-type": "application/json" } }));
    expect(await pending).toBe("done");
  });
});
