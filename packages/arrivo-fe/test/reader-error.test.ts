import { describe, expect, test } from "bun:test";
import { readerError } from "../src/pages/article/reader-error";

const fallback = ["文章载入失败", "Could not load the article."] as const;

describe("reader error messages", () => {
  test("gives the matching recovery action for each offline reason", () => {
    const offline = { code: "OFFLINE_CONTENT_UNAVAILABLE", message: "服务器留存的中文" };
    expect(readerError({ ...offline, reason: "NOT_CACHED" }, fallback)[1]).toContain("Open it once");
    expect(readerError({ ...offline, reason: "USER_SCOPE_UNAVAILABLE" }, fallback)[1]).toContain("sign in");
  });

  test("keeps literal sentence content in a translated validation error", () => {
    const result = readerError({ message: "子句过短或缺少有效内容：原文 A" }, fallback);
    expect(result).toEqual(["子句过短或缺少有效内容：原文 A", "This part is too short or incomplete: 原文 A"]);
  });

  test("retains first-party error meaning and uses the operation fallback for unknown diagnostics", () => {
    expect(readerError({ message: "这个句子已经有该语言内容" }, fallback)[1]).toContain("Edit the existing text");
    expect(readerError({ message: "不应显示的内部诊断" }, fallback)).toEqual(fallback);
  });
});
