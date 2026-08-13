import { describe, expect, test } from "bun:test";
import {
  createSentenceInputSchema,
  incrementArticlePlayCountInputSchema,
  incrementSentencePlayCountInputSchema
} from "../src";

describe("article contracts", () => {
  test("requires an article id when incrementing play count", () => {
    expect(incrementArticlePlayCountInputSchema.parse({ id: "article-a" })).toEqual({ id: "article-a" });
    expect(() => incrementArticlePlayCountInputSchema.parse({ id: "" })).toThrow();
  });

  test("requires a sentence UUID when incrementing its play count", () => {
    expect(incrementSentencePlayCountInputSchema.parse({ id: "019f0000-0000-7000-8000-000000000001" })).toEqual({ id: "019f0000-0000-7000-8000-000000000001" });
    expect(() => incrementSentencePlayCountInputSchema.parse({ id: "sentence-a" })).toThrow();
  });

  test("accepts a target language and an existing semantic sentence group", () => {
    expect(createSentenceInputSchema.parse({
      articleId: "article-a",
      sentenceGroupId: "019f0000-0000-7000-8000-000000000010",
      languageCode: "vi",
      original: "Xin chào",
      translation: "你好"
    })).toMatchObject({ languageCode: "vi" });
    expect(createSentenceInputSchema.parse({
      articleId: "article-a",
      original: "Hello"
    }).languageCode).toBe("en");
    expect(createSentenceInputSchema.safeParse({
      articleId: "article-a",
      languageCode: "de",
      original: "Hallo"
    }).success).toBe(false);
    expect(createSentenceInputSchema.safeParse({
      articleId: "article-a",
      languageCode: "vi",
      original: "Xin chào"
    }).success).toBe(false);
  });
});
