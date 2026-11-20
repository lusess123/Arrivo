import { describe, expect, test } from "bun:test";
import { resolveLanguage } from "../src/lib/ui-language";

describe("interface language", () => {
  test("a saved choice wins over the device language", () => {
    expect(resolveLanguage("en", ["zh-CN"])).toBe("en");
    expect(resolveLanguage("zh", ["en-US"])).toBe("zh");
  });

  test("uses the first supported browser language and recognizes regional variants", () => {
    expect(resolveLanguage(null, ["de-DE", "ZH-Hant-TW", "en-GB"])).toBe("zh");
    expect(resolveLanguage("unexpected", ["en-CA", "zh-CN"])).toBe("en");
  });

  test("falls back to English for unsupported languages", () => {
    expect(resolveLanguage(null, [])).toBe("en");
    expect(resolveLanguage(null, ["zhuang", "fr"])).toBe("en");
  });
});
