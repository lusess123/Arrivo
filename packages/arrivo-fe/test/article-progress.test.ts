import { describe, expect, test } from "bun:test";
import {
  clearCachedArticleProgress,
  readCachedArticleProgress,
  resolveResumeSentenceIndex,
  writeCachedArticleProgress
} from "../src/pages/article/article-progress";

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key)
  };
}

describe("article progress cache", () => {
  test("keeps pending progress isolated by user and article", () => {
    const storage = createStorage();
    writeCachedArticleProgress("user-a", "article-a", "sentence-a", true, storage);
    writeCachedArticleProgress("user-a", "article-b", "sentence-b", false, storage);

    expect(readCachedArticleProgress("user-a", "article-a", storage)).toEqual({
      sentenceId: "sentence-a",
      pending: true
    });
    expect(readCachedArticleProgress("user-a", "article-b", storage)).toEqual({
      sentenceId: "sentence-b",
      pending: false
    });
    expect(readCachedArticleProgress("user-b", "article-a", storage)).toBeNull();

    clearCachedArticleProgress("user-a", "article-a", storage);
    expect(readCachedArticleProgress("user-a", "article-a", storage)).toBeNull();
    expect(readCachedArticleProgress("user-a", "article-b", storage)?.sentenceId).toBe("sentence-b");

    writeCachedArticleProgress("user-a", "article-a", null, true, storage);
    expect(readCachedArticleProgress("user-a", "article-a", storage)).toEqual({
      sentenceId: null,
      pending: true
    });
  });

  test("resolves the saved sentence and falls back to the first visible sentence", () => {
    const sentenceIds = ["sentence-a", "sentence-b", "sentence-c"];

    expect(resolveResumeSentenceIndex(sentenceIds, "sentence-b")).toBe(1);
    expect(resolveResumeSentenceIndex(sentenceIds, "deleted-sentence")).toBe(0);
    expect(resolveResumeSentenceIndex(sentenceIds, null)).toBeNull();
    expect(resolveResumeSentenceIndex([], "sentence-b")).toBeNull();
  });
});
