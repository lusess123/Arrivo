const LOGIN_PATH = '/login';
let redirectPromise: Promise<void> | null = null;

export function isLoginPath(path: string) {
  try {
    return new URL(path, 'https://arrivo.local').pathname === LOGIN_PATH;
  } catch {
    return false;
  }
}

export function buildLoginUrl(returnPath: string) {
  if (!returnPath || isLoginPath(returnPath)) return LOGIN_PATH;
  return `${LOGIN_PATH}?redirect=${encodeURIComponent(returnPath)}`;
}

export function resolvePostLoginPath(redirect: string | null, origin: string) {
  if (!redirect) return '/';

  try {
    const target = new URL(redirect, origin);
    if (target.origin !== origin || isLoginPath(target.pathname)) return '/';
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return '/';
  }
}

export function isAuthenticatedUser(user: unknown): user is { id: string } {
  return Boolean(user && typeof user === 'object' && 'id' in user && user.id);
}

export function redirectToLogin() {
  if (typeof window === 'undefined') return Promise.resolve();

  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (isLoginPath(currentPath)) return Promise.resolve();
  if (redirectPromise) return redirectPromise;

  window.localStorage.removeItem('userData');
  redirectPromise = import('./pwa')
    .then(({ clearPwaUserScope }) => Promise.race([
      clearPwaUserScope(),
      new Promise<false>((resolve) => window.setTimeout(() => resolve(false), 2_000)),
    ]))
    .catch(() => false)
    .then(() => {
      window.location.replace(buildLoginUrl(currentPath));
    });

  return redirectPromise;
}
