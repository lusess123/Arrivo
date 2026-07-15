const PWA_ENABLED = process.env.UMI_APP_PWA_ENABLED === "true";
const MESSAGE_TIMEOUT_MS = 5_000;
const READY_TIMEOUT_MS = 15_000;

let registrationPromise: Promise<ServiceWorkerRegistration | null> | undefined;

type ScopeMessage =
  | { type: "ARRIVO_PWA_SET_USER_SCOPE"; userScope: string }
  | { type: "ARRIVO_PWA_CLEAR_USER_SCOPE"; userScope?: string };

export function registerPwaServiceWorker() {
  if (!PWA_ENABLED || !supportsServiceWorker()) return Promise.resolve(null);
  if (registrationPromise) return registrationPromise;

  registrationPromise = whenPageLoaded()
    .then(() =>
      navigator.serviceWorker.register("/service-worker.js", {
        scope: "/",
        updateViaCache: "none",
      }),
    )
    .then((registration) => {
      void registration.update().catch((error) => {
        console.warn("[Arrivo PWA] Service Worker update check failed", error);
      });
      return registration;
    })
    .catch((error) => {
      registrationPromise = undefined;
      console.warn("[Arrivo PWA] Service Worker registration failed", error);
      return null;
    });

  return registrationPromise;
}

export async function setPwaUserScope(userId: string) {
  const userScope = userId.trim();
  if (!userScope) return false;
  return postScopeMessage({ type: "ARRIVO_PWA_SET_USER_SCOPE", userScope });
}

export async function clearPwaUserScope(userId?: string) {
  const userScope = userId?.trim() || undefined;
  return postScopeMessage({ type: "ARRIVO_PWA_CLEAR_USER_SCOPE", userScope });
}

async function postScopeMessage(message: ScopeMessage) {
  if (!PWA_ENABLED || !supportsServiceWorker()) return false;

  const registration = await registerPwaServiceWorker();
  let serviceWorker =
    navigator.serviceWorker.controller ??
    registration?.active ??
    registration?.waiting;
  if (!serviceWorker) {
    const readyRegistration = await withTimeout(
      navigator.serviceWorker.ready,
      READY_TIMEOUT_MS,
    );
    serviceWorker =
      navigator.serviceWorker.controller ?? readyRegistration?.active ?? null;
  }
  if (!serviceWorker) return false;

  return new Promise<boolean>((resolve) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(() => {
      channel.port1.close();
      resolve(false);
    }, MESSAGE_TIMEOUT_MS);

    channel.port1.onmessage = (event) => {
      window.clearTimeout(timeout);
      channel.port1.close();
      resolve(event.data?.ok === true);
    };

    serviceWorker.postMessage(message, [channel.port2]);
  });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return new Promise<T | null>((resolve) => {
    const timeout = window.setTimeout(() => resolve(null), timeoutMs);
    promise.then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      () => {
        window.clearTimeout(timeout);
        resolve(null);
      },
    );
  });
}

function supportsServiceWorker() {
  return typeof window !== "undefined" && "serviceWorker" in navigator;
}

function whenPageLoaded() {
  if (document.readyState === "complete") return Promise.resolve();

  return new Promise<void>((resolve) => {
    window.addEventListener("load", () => resolve(), { once: true });
  });
}
