import { createDeepSeek } from "@ai-sdk/deepseek";
import { createAiSdkTextClient } from "./ai-sdk.client";
import type { AiClient, AiInput } from "./ai.types";
import type { AiFallbackTextResolver } from "./ai-sdk.client";

export type DeepSeekModelResolver = (input: AiInput) => string | null | undefined;

export type CreateDeepSeekTextClientInput = {
  apiKey: string;
  resolveModel: DeepSeekModelResolver;
  fallbackText: AiFallbackTextResolver;
  fallbackChunkSize?: number | undefined;
  fallbackDelayMs?: number | undefined;
};

export function createDeepSeekTextClient(input: CreateDeepSeekTextClientInput): AiClient {
  const apiKey = input.apiKey.trim();
  const deepseek = apiKey.length >= 10 ? createDeepSeek({ apiKey }) : null;

  return createAiSdkTextClient({
    resolveModel(aiInput) {
      const model = input.resolveModel(aiInput);
      if (!deepseek || !model) return null;
      return deepseek(model);
    },
    fallbackText: input.fallbackText,
    fallbackChunkSize: input.fallbackChunkSize,
    fallbackDelayMs: input.fallbackDelayMs
  });
}
