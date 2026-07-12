import { z } from "zod";

export const ttsAudioQuerySchema = z.object({
  s: z.string().min(1),
  v: z.string().min(1),
  cv: z.string().optional()
});

export const ttsWordsQuerySchema = ttsAudioQuerySchema;

export const ttsVoicesQuerySchema = z.object({
  lang: z.string().optional()
});

export type TtsAudioQuery = z.infer<typeof ttsAudioQuerySchema>;
export type TtsWordsQuery = z.infer<typeof ttsWordsQuerySchema>;
export type TtsVoicesQuery = z.infer<typeof ttsVoicesQuerySchema>;

export type TtsWordBoundaryDto = {
  text: string;
  offsetMs: number;
  durationMs: number;
};

export type VoicePackageDto = {
  name: string;
  gender?: string;
  locale?: string;
  displayName?: string;
};
