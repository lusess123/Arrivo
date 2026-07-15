import { describe, expect, test } from "bun:test";
import {
  classifyRequest,
  contentCacheName,
  isCacheableResponse,
  normalizeUserScope,
} from "../src/pwa/cache-policy";

const appOrigin = "https://arrivo.zyking.xyz";
const apiOrigin = "https://api-arrivo.zyking.xyz";

function classify(url: string, init?: RequestInit) {
  return classifyRequest(new Request(url, { mode: "cors", ...init }), {
    appOrigin,
    apiOrigin,
  });
}

describe("PWA cache policy", () => {
  test("runtime caches successful article detail and TTS reads", () => {
    expect(classify(`${apiOrigin}/api/article/getArticleList`)).toBe("content");
    expect(
      classify(`${apiOrigin}/api/article/getArticleDetail?id=article-1`),
    ).toBe("content");
    expect(classify(`${apiOrigin}/api/tts/audio?text=hello&voice=en-US`)).toBe(
      "content",
    );
    expect(classify(`${apiOrigin}/api/tts/words?text=hello&voice=en-US`)).toBe(
      "content",
    );
  });

  test("supports same-origin API paths used by the local proxy", () => {
    expect(
      classify(`${appOrigin}/api/article/getArticleDetail?id=article-1`),
    ).toBe("content");
  });

  test("never caches authentication, unrelated API reads, or writes", () => {
    expect(classify(`${apiOrigin}/api/auth`)).toBe("bypass");
    expect(classify(`${appOrigin}/api/auth`)).toBe("bypass");
    expect(classify(`${apiOrigin}/api/user/preferences`)).toBe("bypass");
    expect(classify(`${appOrigin}/api/user/preferences`)).toBe("bypass");
    expect(
      classify(`${apiOrigin}/api/article/getArticleDetail?id=article-1`, {
        method: "POST",
      }),
    ).toBe("bypass");
    expect(
      classify(`${apiOrigin}/api/tts/audio?text=hello`, { method: "DELETE" }),
    ).toBe("bypass");
  });

  test("never caches a matching path from an unrelated origin", () => {
    expect(classify("https://example.com/api/tts/audio?text=hello")).toBe(
      "bypass",
    );
  });

  test("uses the app shell for navigations and cache-first for local static assets", () => {
    expect(
      classify(`${appOrigin}/article/article-1`, {
        headers: { Accept: "text/html" },
      }),
    ).toBe("navigation");
    expect(classify(`${appOrigin}/umi.abc123.js`)).toBe("static");
    expect(classify("https://cdn.example.com/app.js")).toBe("bypass");
  });

  test("only stores successful readable responses plus fetched opaque media", () => {
    expect(isCacheableResponse({ status: 200, type: "cors" })).toBe(true);
    expect(isCacheableResponse({ status: 204, type: "basic" })).toBe(true);
    expect(isCacheableResponse({ status: 503, type: "cors" })).toBe(false);
    expect(isCacheableResponse({ status: 0, type: "opaque" })).toBe(true);
    expect(isCacheableResponse({ status: 0, type: "error" })).toBe(false);
  });

  test("isolates personalized content caches with a validated user scope", () => {
    expect(normalizeUserScope(" user_123 ")).toBe("user_123");
    expect(normalizeUserScope("")).toBeNull();
    expect(normalizeUserScope("../shared")).toBeNull();
    expect(contentCacheName("user_123")).toBe("arrivo-pwa-content-v1-user_123");
    expect(contentCacheName("user_456")).not.toBe(contentCacheName("user_123"));
  });
});
