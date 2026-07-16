import { describe, expect, test } from "bun:test";
import { articleProgressInputSchema } from "../src";

describe("articleProgressInputSchema", () => {
  test("accepts only article and sentence UUIDs", () => {
    expect(articleProgressInputSchema.parse({
      articleId: "019f0000-0000-7000-8000-000000000010",
      sentenceId: "019f0000-0000-7000-8000-000000000011"
    })).toEqual({
      articleId: "019f0000-0000-7000-8000-000000000010",
      sentenceId: "019f0000-0000-7000-8000-000000000011"
    });

    expect(() => articleProgressInputSchema.parse({
      articleId: "not-an-article-id",
      sentenceId: "not-a-sentence-id"
    })).toThrow();
  });
});
