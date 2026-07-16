import { z } from "zod";

export const sentenceInputSchema = z.object({
  sentence: z.string().optional(),
  phonetic: z.string().optional(),
  translation: z.string().trim().optional(),
  original: z.string().trim().optional(),
  delay: z.number().optional()
});

export const createArticleInputSchema = z.object({
  title: z.string().trim().min(1),
  isPublic: z.boolean().optional(),
  sentences: z.array(sentenceInputSchema).optional().default([])
});

export const articleDetailQuerySchema = z.object({
  id: z.string().min(1)
});

export const updateArticleInputSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1)
});

export const deleteArticleInputSchema = z.object({
  id: z.string().min(1)
});

export const createSentenceInputSchema = z.object({
  articleId: z.string().min(1),
  original: z.string().trim().optional(),
  translation: z.string().trim().optional(),
  insertIndex: z.number().int().min(0).optional()
}).refine((input) => Boolean(input.original || input.translation), {
  message: "句子内容不能为空"
});

export const updateSentenceInputSchema = z.object({
  id: z.string().min(1),
  original: z.string().trim().optional(),
  translation: z.string().trim().optional()
}).refine((input) => Boolean(input.original || input.translation), {
  message: "句子内容不能为空"
});

export const deleteSentenceInputSchema = z.object({
  id: z.string().min(1)
});

export const moveSentenceInputSchema = z.object({
  id: z.string().min(1),
  direction: z.enum(["up", "down"])
});

export type SentenceInput = z.infer<typeof sentenceInputSchema>;
export type CreateArticleInput = z.infer<typeof createArticleInputSchema>;
export type ArticleDetailQuery = z.infer<typeof articleDetailQuerySchema>;
export type UpdateArticleInput = z.infer<typeof updateArticleInputSchema>;
export type DeleteArticleInput = z.infer<typeof deleteArticleInputSchema>;
export type CreateSentenceInput = z.infer<typeof createSentenceInputSchema>;
export type UpdateSentenceInput = z.infer<typeof updateSentenceInputSchema>;
export type DeleteSentenceInput = z.infer<typeof deleteSentenceInputSchema>;
export type MoveSentenceInput = z.infer<typeof moveSentenceInputSchema>;

export type ArticleSentenceDto = {
  id: string;
  originalContent: string | null;
  translatedContent: string | null;
  sortOrder: number;
};

export type ArticleDto = {
  id: string;
  title: string | null;
  userId: string | null;
  isPublic: boolean;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  Sentences: ArticleSentenceDto[];
};

export type ArticleDetailDto = ArticleDto & {
  nextArticleId: string | null;
};
