import { z } from "zod";

export const articleProgressInputSchema = z.object({
  articleId: z.string().uuid(),
  sentenceId: z.string().uuid()
});

export const articleProgressArticleParamSchema = z.object({
  articleId: z.string().uuid()
});

export const articleProgressSentenceInputSchema = articleProgressInputSchema.pick({
  sentenceId: true
});

export type ArticleProgressInput = z.infer<typeof articleProgressInputSchema>;
export type ArticleProgressDto = ArticleProgressInput;
