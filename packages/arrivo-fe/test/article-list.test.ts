import { describe, expect, test } from "bun:test";
import { sortPublicArticles } from "../src/pages/article-list";

describe("public article list", () => {
  test("sorts by play count with a stable newest-first fallback", () => {
    const articles = [
      { id: "b", playCount: 2, createdAt: "2026-07-16T00:00:00.000Z" },
      { id: "a", playCount: 5, createdAt: "2026-07-15T00:00:00.000Z" },
      { id: "c", playCount: 2, createdAt: "2026-07-17T00:00:00.000Z" }
    ];

    expect(sortPublicArticles(articles).map((article) => article.id)).toEqual(["a", "c", "b"]);
    expect(articles.map((article) => article.id)).toEqual(["b", "a", "c"]);
  });
});
