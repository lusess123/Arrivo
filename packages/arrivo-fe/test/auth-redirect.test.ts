import { describe, expect, test } from 'bun:test';
import {
  buildLoginUrl,
  isAuthenticatedUser,
  isLoginPath,
  resolvePostLoginPath,
} from '../src/lib/auth-redirect';

describe('auth redirect', () => {
  test('preserves the protected page as a relative return path', () => {
    expect(buildLoginUrl('/article/123?tab=public#sentence-2')).toBe(
      '/login?redirect=%2Farticle%2F123%3Ftab%3Dpublic%23sentence-2',
    );
  });

  test('recognizes the login page and its query string', () => {
    expect(isLoginPath('/login')).toBe(true);
    expect(isLoginPath('/login?emailLink=1')).toBe(true);
    expect(isLoginPath('/article/login')).toBe(false);
  });

  test('only allows same-origin post-login redirects', () => {
    expect(resolvePostLoginPath('/article/123', 'https://arrivo.zyking.xyz')).toBe('/article/123');
    expect(resolvePostLoginPath('https://arrivo.zyking.xyz/article/123', 'https://arrivo.zyking.xyz')).toBe('/article/123');
    expect(resolvePostLoginPath('https://example.com/phishing', 'https://arrivo.zyking.xyz')).toBe('/');
  });

  test('does not treat an empty successful auth response as logged in', () => {
    expect(isAuthenticatedUser({})).toBe(false);
    expect(isAuthenticatedUser({ id: '' })).toBe(false);
    expect(isAuthenticatedUser({ id: 'user-123' })).toBe(true);
  });
});
