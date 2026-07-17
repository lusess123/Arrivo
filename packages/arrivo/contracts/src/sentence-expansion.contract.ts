import { z } from "zod";

export const sentenceExpansionArticleParamSchema = z.object({
  articleId: z.string().uuid()
});

export const sentenceExpansionInputSchema = z.object({
  sentenceId: z.string().uuid(),
  expanded: z.boolean()
});

export type SentenceExpansionInput = z.infer<typeof sentenceExpansionInputSchema>;

export type SentenceExpansionDto = {
  articleId: string;
  expandedSentenceIds: string[];
};
