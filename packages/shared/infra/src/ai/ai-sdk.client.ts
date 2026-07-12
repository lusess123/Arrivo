import { generateText as aiGenerateText, streamText as aiStreamText } from "ai";
import type { LanguageModel, ModelMessage } from "ai";
import type { AiClient, AiInput, AiTextMessage, AiTextMessagesInput } from "./ai.types";

export type AiModelResolver = (input: AiInput) => LanguageModel | null | undefined;

export type AiFallbackTextResolver = (input: AiInput) => string | Promise<string>;

export type CreateAiSdkTextClientInput = {
  resolveModel: AiModelResolver;
  fallbackText: AiFallbackTextResolver;
  fallbackChunkSize?: number | undefined;
  fallbackDelayMs?: number | undefined;
};

export function createAiSdkTextClient(input: CreateAiSdkTextClientInput): AiClient {
  const fallbackChunkSize = input.fallbackChunkSize ?? 18;
  const fallbackDelayMs = input.fallbackDelayMs ?? 8;

  return {
    async generateText(aiInput) {
      const promptInput = resolvePromptInput({ input: aiInput });
      const model = input.resolveModel(aiInput);
      if (!model) return input.fallbackText(aiInput);

      const result = await aiGenerateText({
        model,
        ...promptInput
      });
      return result.text;
    },
    async *streamText(aiInput) {
      const promptInput = resolvePromptInput({ input: aiInput });
      const model = input.resolveModel(aiInput);
      if (!model) {
        yield* streamFallbackText({
          text: await input.fallbackText(aiInput),
          chunkSize: fallbackChunkSize,
          delayMs: fallbackDelayMs
        });
        return;
      }

      const result = aiStreamText({
        model,
        ...promptInput
      });

      for await (const chunk of result.textStream) {
        yield chunk;
      }
    }
  };
}

type AiSdkPromptInput =
  | {
      system?: string;
      prompt: string;
    }
  | {
      system?: string;
      messages: ModelMessage[];
    };

function resolvePromptInput({ input }: { input: AiInput }): AiSdkPromptInput {
  if (hasMessagesInput(input)) {
    if (input.messages.length === 0) {
      throw new Error("AiInput requires at least one message when messages is used.");
    }

    return {
      ...(input.system ? { system: input.system } : {}),
      messages: mapAiMessages({ messages: input.messages })
    };
  }

  if (!input.prompt) {
    throw new Error("AiInput requires prompt or messages.");
  }

  return {
    ...(input.system ? { system: input.system } : {}),
    prompt: input.prompt
  };
}

function hasMessagesInput(input: AiInput): input is AiTextMessagesInput {
  return Array.isArray(input.messages);
}

function mapAiMessages({ messages }: { messages: AiTextMessage[] }): ModelMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.content
  }));
}

export type CreateMockAiClientInput = {
  fallbackText: AiFallbackTextResolver;
  chunkSize?: number | undefined;
  delayMs?: number | undefined;
};

export function createMockAiClient(input: CreateMockAiClientInput): AiClient {
  const chunkSize = input.chunkSize ?? 18;
  const delayMs = input.delayMs ?? 8;

  return {
    async generateText(aiInput) {
      resolvePromptInput({ input: aiInput });
      return input.fallbackText(aiInput);
    },
    async *streamText(aiInput) {
      resolvePromptInput({ input: aiInput });
      yield* streamFallbackText({
        text: await input.fallbackText(aiInput),
        chunkSize,
        delayMs
      });
    }
  };
}

async function* streamFallbackText({
  text,
  chunkSize,
  delayMs
}: {
  text: string;
  chunkSize: number;
  delayMs: number;
}) {
  for (const chunk of splitTextIntoChunks({ text, chunkSize })) {
    await wait({ delayMs });
    yield chunk;
  }
}

function splitTextIntoChunks({ text, chunkSize }: { text: string; chunkSize: number }) {
  return text.match(new RegExp(`.{1,${chunkSize}}`, "gs")) ?? [text];
}

function wait({ delayMs }: { delayMs: number }) {
  return new Promise<void>((resolve) => setTimeout(resolve, delayMs));
}
