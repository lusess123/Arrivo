export type AiTextMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type AiTextCommonInput = {
  purpose?: string | undefined;
  system?: string | undefined;
  modelProvider?: string | undefined;
  model?: string | undefined;
};

export type AiTextInput = {
  prompt: string;
  messages?: never;
} & AiTextCommonInput;

export type AiTextMessagesInput = {
  messages: AiTextMessage[];
  prompt?: never;
} & AiTextCommonInput;

export type AiInput = AiTextInput | AiTextMessagesInput;

export type AiClient = {
  generateText(input: AiInput): Promise<string>;
  streamText?(input: AiInput): AsyncIterable<string>;
};
