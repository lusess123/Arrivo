import { describe, expect, test } from "bun:test";
import { incrementArticlePlayCountInputSchema, incrementSentencePlayCountInputSchema } from "../src";

describe("article contracts", () => {
  test("requires an article id when incrementing play count", () => {
    expect(incrementArticlePlayCountInputSchema.parse({ id: "article-a" })).toEqual({ id: "article-a" });
    expect(() => incrementArticlePlayCountInputSchema.parse({ id: "" })).toThrow();
  });

  test("requires a sentence UUID when incrementing its play count", () => {
    expect(incrementSentencePlayCountInputSchema.parse({ id: "019f0000-0000-7000-8000-000000000001" })).toEqual({ id: "019f0000-0000-7000-8000-000000000001" });
    expect(() => incrementSentencePlayCountInputSchema.parse({ id: "sentence-a" })).toThrow();
  });
});
