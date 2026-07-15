import { describe, expect, test } from "bun:test";
import { toPrecacheUrl, validatePrecacheUrls } from "../scripts/build-pwa";

describe("PWA build manifest", () => {
  test("normalizes nested dist files to root-relative URLs", () => {
    expect(toPrecacheUrl("static/logo.12345678.png")).toBe(
      "/static/logo.12345678.png",
    );
  });

  test("requires the app shell and real hashed Umi bundles", () => {
    expect(() =>
      validatePrecacheUrls([
        "/index.html",
        "/umi.1234abcd.js",
        "/umi.1234abcd.css",
      ]),
    ).not.toThrow();
    expect(() => validatePrecacheUrls(["/index.html", "/favicon.svg"])).toThrow(
      "hashed JavaScript or CSS",
    );
    expect(() => validatePrecacheUrls(["/umi.1234abcd.js"])).toThrow(
      "/index.html",
    );
  });
});
