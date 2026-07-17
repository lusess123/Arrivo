import { describe, expect, test } from "bun:test";
import { incrementArticlePlayCountInputSchema } from "../src";

describe("article contracts", () => {
  test("requires an article id when incrementing play count", () => {
    expect(incrementArticlePlayCountInputSchema.parse({ id: "article-a" })).toEqual({ id: "article-a" });
    expect(() => incrementArticlePlayCountInputSchema.parse({ id: "" })).toThrow();
  });
});
