export type AiGatewayTextClient = {
  streamText(input: { system: string; prompt: string }): AsyncIterable<string>;
  generateText(input: { system: string; prompt: string }): Promise<string>;
};

type AiGatewayConfig = {
  gatewayToken: string;
  baseUrl: string;
  model: string;
  timeoutMs?: number;
};

export function createAiGatewayTextClient(config: AiGatewayConfig): AiGatewayTextClient {
  const endpoint = `${config.baseUrl.replace(/\/$/, "")}/chat/completions`;

  async function request(input: { system: string; prompt: string; stream: boolean }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs ?? 90_000);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "cf-aig-authorization": `Bearer ${config.gatewayToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: config.model,
        stream: input.stream,
        temperature: 0.2,
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.prompt }
        ]
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      clearTimeout(timeout);
      throw new Error(`AI Gateway 请求失败 (${response.status})`);
    }
    return { response, stopTimeout: () => clearTimeout(timeout) };
  }

  return {
    async generateText(input) {
      const requestResult = await request({ ...input, stream: false });
      try {
        const body = await requestResult.response.json() as { choices?: Array<{ message?: { content?: string } }> };
        return body.choices?.[0]?.message?.content ?? "";
      } finally {
        requestResult.stopTimeout();
      }
    },
    async *streamText(input) {
      const requestResult = await request({ ...input, stream: true });
      const response = requestResult.response;
      if (!response.body) {
        requestResult.stopTimeout();
        throw new Error("AI Gateway 未返回响应流");
      }

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += value;
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            const event = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
            const text = event.choices?.[0]?.delta?.content;
            if (text) yield text;
          }
        }
      } finally {
        requestResult.stopTimeout();
        reader.releaseLock();
      }
    }
  };
}
