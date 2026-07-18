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

export const incrementArticlePlayCountInputSchema = z.object({
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

export const sentenceSplitParamSchema = z.object({
  articleId: z.string().uuid(),
  sentenceId: z.string().uuid()
});

export const sentenceSplitBatchInputSchema = z.object({
  limit: z.number().int().min(1).max(50).optional().default(20),
  retryFailed: z.boolean().optional().default(false)
});

export const sentenceRegenerateInputSchema = z.object({
  feedback: z.string().trim().max(1000).optional().default("")
});

export const sentenceForceSplitInputSchema = z.object({
  targetCount: z.union([z.literal(2), z.literal(3), z.literal("auto")]).default("auto"),
  instruction: z.string().trim().max(1000).optional().default(""),
  failedOutput: z.string().max(12000).optional().default(""),
  validationError: z.string().max(1000).optional().default("")
});

export type SentenceInput = z.infer<typeof sentenceInputSchema>;
export type CreateArticleInput = z.infer<typeof createArticleInputSchema>;
export type ArticleDetailQuery = z.infer<typeof articleDetailQuerySchema>;
export type IncrementArticlePlayCountInput = z.infer<typeof incrementArticlePlayCountInputSchema>;
export type UpdateArticleInput = z.infer<typeof updateArticleInputSchema>;
export type DeleteArticleInput = z.infer<typeof deleteArticleInputSchema>;
export type CreateSentenceInput = z.infer<typeof createSentenceInputSchema>;
export type UpdateSentenceInput = z.infer<typeof updateSentenceInputSchema>;
export type DeleteSentenceInput = z.infer<typeof deleteSentenceInputSchema>;
export type MoveSentenceInput = z.infer<typeof moveSentenceInputSchema>;
export type SentenceSplitParam = z.infer<typeof sentenceSplitParamSchema>;
export type SentenceSplitBatchInput = z.infer<typeof sentenceSplitBatchInputSchema>;
export type SentenceRegenerateInput = z.infer<typeof sentenceRegenerateInputSchema>;
export type SentenceForceSplitInput = z.infer<typeof sentenceForceSplitInputSchema>;

export const SENTENCE_SPLIT_STATUSES = [
  "UNKNOWN",
  "SPLITTABLE",
  "SPLITTING",
  "SPLIT",
  "UNSPLITTABLE",
  "FAILED"
] as const;

export type SentenceSplitStatus = typeof SENTENCE_SPLIT_STATUSES[number];

export type ArticleSentenceDto = {
  id: string;
  originalContent: string | null;
  translatedContent: string | null;
  sortOrder: number;
  parentSentenceId: string | null;
  splitStatus: SentenceSplitStatus;
};

export type ArticleDto = {
  id: string;
  title: string | null;
  userId: string | null;
  isPublic: boolean;
  playCount: number;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  Sentences: ArticleSentenceDto[];
};

export type ArticleDetailDto = ArticleDto & {
  nextArticleId: string | null;
};
