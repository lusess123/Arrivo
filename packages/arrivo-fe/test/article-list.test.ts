import { describe, expect, test } from "bun:test";
import { resolveArticleTab, sortPublicArticles, withArticleTab } from "../src/pages/article-list";

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

describe("article list tab URL", () => {
  test("defaults invalid or missing values to my articles", () => {
    expect(resolveArticleTab(new URLSearchParams())).toBe("mine");
    expect(resolveArticleTab(new URLSearchParams("tab=unknown"))).toBe("mine");
  });

  test("restores the public tab and preserves other query parameters", () => {
    const searchParams = new URLSearchParams("tab=public&source=home");
    expect(resolveArticleTab(searchParams)).toBe("public");
    expect(withArticleTab(searchParams, "mine").toString()).toBe("tab=mine&source=home");
  });
});
