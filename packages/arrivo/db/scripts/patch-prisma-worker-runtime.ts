import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const generatedDir = path.resolve(import.meta.dir, "../src/generated/prisma-worker");

await patchGeneratedPrismaFiles({ dir: generatedDir });

async function patchGeneratedPrismaFiles({ dir }: { dir: string }) {
  const files = await listTypeScriptFiles({ dir });
  for (const file of files) {
    const source = await readFile(file, "utf8");
    const patched = patchPrismaSource({ source, isClientEntry: file.endsWith("/client.ts") });
    if (patched !== source) {
      await writeFile(file, patched);
    }
  }
}

async function listTypeScriptFiles({ dir }: { dir: string }) {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listTypeScriptFiles({ dir: fullPath })));
      continue;
    }
    if (entry.isFile() && fullPath.endsWith(".ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

function patchPrismaSource({ source, isClientEntry }: { source: string; isClientEntry: boolean }) {
  const withWorkerRuntime = source.replaceAll(
    "@prisma/client/runtime/client",
    "@prisma/client/runtime/wasm-compiler-edge"
  );
  if (!isClientEntry) return withWorkerRuntime;

  return withWorkerRuntime
    .replace("import * as path from 'node:path'\n", "")
    .replace("import { fileURLToPath } from 'node:url'\n", "")
    .replace("globalThis['__dirname'] = path.dirname(fileURLToPath(import.meta.url))\n", "");
}
