import { createHash } from "node:crypto";
import { readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const distDirectory = path.join(packageRoot, "dist");
const serviceWorkerEntry = path.join(packageRoot, "src/pwa/service-worker.ts");
const serviceWorkerOutput = path.join(distDirectory, "service-worker.js");

export function toPrecacheUrl(relativePath: string) {
  return `/${relativePath.split(path.sep).join("/")}`;
}

export function validatePrecacheUrls(urls: string[]) {
  if (!urls.includes("/index.html"))
    throw new Error("PWA build is missing /index.html");

  const hashedBundlePattern = /\.[a-f0-9]{8}\.(?:js|css)$/;
  if (!urls.some((url) => hashedBundlePattern.test(url))) {
    throw new Error(
      "PWA build did not find any hashed JavaScript or CSS bundles",
    );
  }
}

export async function collectPrecacheUrls(directory = distDirectory) {
  const files = await walkFiles(directory);
  const urls = files
    .filter((file) => file !== "service-worker.js" && !file.endsWith(".map"))
    .map(toPrecacheUrl)
    .sort();

  validatePrecacheUrls(urls);
  return ["/", ...urls];
}

export async function createBuildVersion(
  urls: string[],
  directory = distDirectory,
) {
  const hash = createHash("sha256");

  for (const url of urls) {
    hash.update(url);
    if (url !== "/")
      hash.update(await readFile(path.join(directory, url.slice(1))));
  }

  return hash.digest("hex").slice(0, 12);
}

async function walkFiles(
  directory: string,
  relativeDirectory = "",
): Promise<string[]> {
  const entries = await readdir(path.join(directory, relativeDirectory), {
    withFileTypes: true,
  });
  const files = await Promise.all(
    entries.map((entry) => {
      const relativePath = path.join(relativeDirectory, entry.name);
      return entry.isDirectory()
        ? walkFiles(directory, relativePath)
        : Promise.resolve([relativePath]);
    }),
  );

  return files.flat();
}

async function buildPwa() {
  await rm(serviceWorkerOutput, { force: true });

  const precacheUrls = await collectPrecacheUrls();
  const buildVersion = await createBuildVersion(precacheUrls);
  const apiOrigin = "https://api-arrivo.zyking.xyz";
  const result = await Bun.build({
    entrypoints: [serviceWorkerEntry],
    outdir: distDirectory,
    naming: "service-worker.js",
    target: "browser",
    minify: true,
    define: {
      __PWA_API_ORIGIN__: JSON.stringify(apiOrigin),
      __PWA_BUILD_VERSION__: JSON.stringify(buildVersion),
      __PWA_PRECACHE_URLS__: JSON.stringify(precacheUrls),
    },
  });

  if (!result.success) {
    for (const log of result.logs) console.error(log);
    throw new Error("Failed to build the PWA Service Worker");
  }

  console.log(
    `PWA Service Worker ${buildVersion}: precached ${precacheUrls.length} URLs`,
  );
}

if (import.meta.main) await buildPwa();
