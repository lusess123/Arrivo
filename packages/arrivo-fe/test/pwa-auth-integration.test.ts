import { describe, expect, test } from "bun:test";

describe("PWA authenticated cache lifecycle", () => {
  test("sets the user scope before protected content loads and clears it on logout or 401", async () => {
    const [authHook, authRedirect, homePage, articlePage] = await Promise.all([
      Bun.file(new URL("../src/hooks/auth.tsx", import.meta.url)).text(),
      Bun.file(new URL("../src/lib/auth-redirect.ts", import.meta.url)).text(),
      Bun.file(new URL("../src/pages/index.tsx", import.meta.url)).text(),
      Bun.file(new URL("../src/pages/article/index.tsx", import.meta.url)).text()
    ]);

    expect(authHook).toContain("await setPwaUserScope(String(user.id))");
    expect(authHook).toContain("await clearPwaUserScope()");
    expect(authRedirect).toContain("clearPwaUserScope()");
    expect(homePage).toContain("await auth.clearUser?.()");
    expect(articlePage).toContain("await auth.clearUser?.()");
  });
});
