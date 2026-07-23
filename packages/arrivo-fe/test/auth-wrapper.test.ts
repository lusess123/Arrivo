import { describe, expect, test } from 'bun:test';

describe('auth route wrapper', () => {
  test('renders the nested Umi route after authentication', async () => {
    const source = await Bun.file(
      new URL('../src/wrappers/auth.tsx', import.meta.url),
    ).text();

    expect(source).toContain('import { Outlet, useLocation } from "@umijs/max";');
    expect(source).toContain('if (!checking) return <Outlet />;');
    expect(source).not.toContain('return children');
  });
});
