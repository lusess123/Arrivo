import { z } from "zod";

export const sentenceVisibilityArticleParamSchema = z.object({
  articleId: z.string().uuid()
});

export const sentenceVisibilityInputSchema = z.object({
  sentenceId: z.string().uuid(),
  showOriginal: z.boolean(),
  showTranslation: z.boolean()
});

export type SentenceTextVisibility = {
  showOriginal: boolean;
  showTranslation: boolean;
};

export type SentenceVisibilityDto = {
  articleId: string;
  visibilityBySentenceId: Record<string, SentenceTextVisibility>;
};

export type SentenceVisibilityInput = z.infer<typeof sentenceVisibilityInputSchema>;
