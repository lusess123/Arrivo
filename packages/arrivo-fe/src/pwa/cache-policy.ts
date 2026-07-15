export type CacheStrategy = "navigation" | "static" | "content" | "bypass";

export interface CacheOrigins {
  appOrigin: string;
  apiOrigin: string;
}

const CONTENT_API_PATHS = new Set([
  "/api/article/getArticleList",
  "/api/article/getArticleDetail",
  "/api/tts/audio",
  "/api/tts/words",
]);

export const CONTENT_CACHE_PREFIX = "arrivo-pwa-content-v1-";

export function classifyRequest(
  request: Request,
  origins: CacheOrigins,
): CacheStrategy {
  if (request.method !== "GET") return "bypass";

  const url = new URL(request.url);
  const isApiOrigin =
    url.origin === origins.apiOrigin || url.origin === origins.appOrigin;

  if (isApiOrigin && CONTENT_API_PATHS.has(url.pathname)) return "content";
  if (isApiOrigin && url.pathname.startsWith("/api/")) return "bypass";
  if (url.origin !== origins.appOrigin) return "bypass";

  const acceptsHtml =
    request.headers.get("accept")?.includes("text/html") ?? false;
  if (acceptsHtml) return "navigation";

  return "static";
}

export function isCacheableResponse(
  response: Pick<Response, "status" | "type">,
) {
  if (response.type === "opaque") return true;
  return (
    response.type !== "error" && response.status >= 200 && response.status < 300
  );
}

export function normalizeUserScope(value: unknown) {
  if (typeof value !== "string") return null;

  const scope = value.trim();
  if (!scope || scope.length > 128 || !/^[A-Za-z0-9_-]+$/.test(scope))
    return null;

  return scope;
}

export function contentCacheName(userScope: string) {
  const normalizedScope = normalizeUserScope(userScope);
  if (!normalizedScope) throw new Error("Invalid PWA user scope");
  return `${CONTENT_CACHE_PREFIX}${normalizedScope}`;
}
