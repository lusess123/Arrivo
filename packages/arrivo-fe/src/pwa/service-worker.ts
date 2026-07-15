import {
  CONTENT_CACHE_PREFIX,
  classifyRequest,
  contentCacheName,
  isCacheableResponse,
  normalizeUserScope,
} from "./cache-policy";

declare const __PWA_API_ORIGIN__: string;
declare const __PWA_BUILD_VERSION__: string;
declare const __PWA_PRECACHE_URLS__: string[];

interface ExtendableEventLike {
  waitUntil(promise: Promise<unknown>): void;
}

interface FetchEventLike extends ExtendableEventLike {
  request: Request;
  respondWith(response: Promise<Response>): void;
}

interface MessageEventLike extends ExtendableEventLike {
  data?: unknown;
  ports?: MessagePort[];
}

interface WorkerScopeLike {
  location: Location;
  clients: { claim(): Promise<void> };
  skipWaiting(): Promise<void>;
  addEventListener(type: string, listener: (event: any) => void): void;
}

type PwaMessage =
  | { type: "ARRIVO_PWA_SET_USER_SCOPE"; userScope: unknown }
  | { type: "ARRIVO_PWA_CLEAR_USER_SCOPE"; userScope?: unknown };

const workerScope = globalThis as unknown as WorkerScopeLike;
const CACHE_NAMESPACE = "arrivo-pwa-";
const STATIC_CACHE_PREFIX = `${CACHE_NAMESPACE}static-`;
const STATIC_CACHE = `${STATIC_CACHE_PREFIX}${__PWA_BUILD_VERSION__}`;
const METADATA_CACHE_PREFIX = `${CACHE_NAMESPACE}metadata-`;
const METADATA_CACHE = `${METADATA_CACHE_PREFIX}v1`;
const USER_SCOPE_STORAGE_URL = new URL(
  "/__arrivo_pwa__/current-user-scope",
  workerScope.location.origin,
).toString();
const APP_SHELL_URL = "/index.html";
const ORIGINS = {
  appOrigin: workerScope.location.origin,
  apiOrigin: __PWA_API_ORIGIN__,
};

let currentUserScope: string | null | undefined;
let scopeMutation = Promise.resolve();

workerScope.addEventListener("install", (event: ExtendableEventLike) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);

      await Promise.all(
        __PWA_PRECACHE_URLS__.map(async (url) => {
          const response = await fetch(new Request(url, { cache: "reload" }));
          if (!isCacheableResponse(response)) {
            throw new Error(
              `Unable to precache ${url}: HTTP ${response.status}`,
            );
          }
          await cache.put(url, response);
        }),
      );

      await workerScope.skipWaiting();
    })(),
  );
});

workerScope.addEventListener("activate", (event: ExtendableEventLike) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          const isOldStaticCache =
            cacheName.startsWith(STATIC_CACHE_PREFIX) &&
            cacheName !== STATIC_CACHE;
          const isOldContentCache =
            cacheName.startsWith(`${CACHE_NAMESPACE}content-`) &&
            !cacheName.startsWith(CONTENT_CACHE_PREFIX);
          const isOldMetadataCache =
            cacheName.startsWith(METADATA_CACHE_PREFIX) &&
            cacheName !== METADATA_CACHE;

          return isOldStaticCache || isOldContentCache || isOldMetadataCache
            ? caches.delete(cacheName)
            : Promise.resolve(false);
        }),
      );
      await workerScope.clients.claim();
    })(),
  );
});

workerScope.addEventListener("message", (event: MessageEventLike) => {
  const message = event.data as PwaMessage | undefined;
  if (!message || typeof message !== "object" || !("type" in message)) return;

  const operation = handleScopeMessage(message)
    .then((result) => event.ports?.[0]?.postMessage({ ok: true, ...result }))
    .catch((error) => {
      event.ports?.[0]?.postMessage({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    });

  event.waitUntil(operation);
});

workerScope.addEventListener("fetch", (event: FetchEventLike) => {
  const strategy = classifyRequest(event.request, ORIGINS);

  if (strategy === "navigation") {
    event.respondWith(handleNavigation(event.request));
    return;
  }

  if (strategy === "static") {
    event.respondWith(handleStaticRequest(event.request, event));
    return;
  }

  if (strategy === "content") {
    event.respondWith(handleContentRequest(event.request, event));
  }
});

async function handleNavigation(request: Request) {
  try {
    return await fetch(request);
  } catch {
    const cachedShell = await caches.match(APP_SHELL_URL);
    return cachedShell ?? offlinePageResponse();
  }
}

async function handleStaticRequest(
  request: Request,
  event: ExtendableEventLike,
) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (isCacheableResponse(response)) {
      event.waitUntil(storeResponse(STATIC_CACHE, request, response.clone()));
    }
    return response;
  } catch {
    return Response.error();
  }
}

async function handleContentRequest(
  request: Request,
  event: ExtendableEventLike,
) {
  const userScope = await getCurrentUserScope();
  if (!userScope) {
    try {
      return await fetch(request);
    } catch {
      return offlineContentResponse("USER_SCOPE_UNAVAILABLE");
    }
  }

  const cacheName = contentCacheName(userScope);
  const cacheKey = new Request(request.url, { method: "GET" });

  try {
    const response = await fetch(withoutRangeHeader(request));
    if (isCacheableResponse(response)) {
      event.waitUntil(storeResponse(cacheName, cacheKey, response.clone()));
    }
    return response;
  } catch {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(cacheKey, { ignoreVary: true });
    return cached ?? offlineContentResponse("NOT_CACHED");
  }
}

function withoutRangeHeader(request: Request) {
  if (!request.headers.has("range")) return request;

  try {
    const headers = new Headers(request.headers);
    headers.delete("range");
    return new Request(request, { headers });
  } catch {
    return request;
  }
}

async function storeResponse(
  cacheName: string,
  request: Request | string,
  response: Response,
) {
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response);
  } catch (error) {
    console.warn("[Arrivo PWA] Failed to store cache response", error);
  }
}

async function handleScopeMessage(message: PwaMessage) {
  if (message.type === "ARRIVO_PWA_SET_USER_SCOPE") {
    const userScope = normalizeUserScope(message.userScope);
    if (!userScope) throw new Error("Invalid PWA user scope");
    await setCurrentUserScope(userScope);
    return { userScope };
  }

  if (message.type === "ARRIVO_PWA_CLEAR_USER_SCOPE") {
    if (
      message.userScope !== undefined &&
      !normalizeUserScope(message.userScope)
    ) {
      throw new Error("Invalid PWA user scope");
    }
    const requestedScope = normalizeUserScope(message.userScope);
    const clearedScope = await clearUserScope(requestedScope);
    return { userScope: clearedScope };
  }

  return {};
}

async function getCurrentUserScope() {
  const operation = scopeMutation.then(async () => {
    if (currentUserScope !== undefined) return currentUserScope;

    const metadata = await caches.open(METADATA_CACHE);
    const response = await metadata.match(USER_SCOPE_STORAGE_URL);
    currentUserScope = response
      ? normalizeUserScope(await response.text())
      : null;
    return currentUserScope;
  });

  scopeMutation = operation.then(
    () => undefined,
    () => undefined,
  );
  return operation;
}

async function setCurrentUserScope(userScope: string) {
  const operation = scopeMutation.then(async () => {
    const metadata = await caches.open(METADATA_CACHE);
    await metadata.put(
      USER_SCOPE_STORAGE_URL,
      new Response(userScope, {
        headers: { "content-type": "text/plain; charset=utf-8" },
      }),
    );
    currentUserScope = userScope;
  });

  scopeMutation = operation.catch(() => undefined);
  await operation;
}

async function clearUserScope(requestedScope: string | null) {
  let clearedScope: string | null = null;
  const operation = scopeMutation.then(async () => {
    const activeScope = await readStoredUserScope();
    const scopeToClear = requestedScope ?? activeScope;
    if (scopeToClear) {
      await caches.delete(contentCacheName(scopeToClear));
      clearedScope = scopeToClear;
    }

    if (!requestedScope || requestedScope === activeScope) {
      const metadata = await caches.open(METADATA_CACHE);
      await metadata.delete(USER_SCOPE_STORAGE_URL);
      currentUserScope = null;
    }
  });

  scopeMutation = operation.catch(() => undefined);
  await operation;
  return clearedScope;
}

async function readStoredUserScope() {
  if (currentUserScope !== undefined) return currentUserScope;
  const metadata = await caches.open(METADATA_CACHE);
  const response = await metadata.match(USER_SCOPE_STORAGE_URL);
  return response ? normalizeUserScope(await response.text()) : null;
}

function offlineContentResponse(
  reason: "USER_SCOPE_UNAVAILABLE" | "NOT_CACHED",
) {
  return Response.json(
    {
      code: "OFFLINE_CONTENT_UNAVAILABLE",
      message:
        reason === "NOT_CACHED"
          ? "此内容尚未离线缓存，请联网加载一次。"
          : "无法确认当前用户，未读取离线内容。",
      reason,
    },
    {
      status: 503,
      headers: {
        "cache-control": "no-store",
        "x-arrivo-offline": "miss",
      },
    },
  );
}

function offlinePageResponse() {
  return new Response(
    '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Arrivo 离线</title><body><main><h1>暂时无法离线打开</h1><p>请联网完整打开 Arrivo 一次后再重试。</p></main></body></html>',
    {
      status: 503,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
}
