import { AsyncLocalStorage } from "node:async_hooks";
import type { ArrivoDb } from "@arrivo/db";

type ScopedDb = {
  client: ArrivoDb | null;
  createClient: () => ArrivoDb;
};

const dbStorage = new AsyncLocalStorage<ScopedDb>();

export function runWithDbClientFactory<T>({
  createDb,
  run
}: {
  createDb: () => ArrivoDb;
  run: () => T;
}) {
  return dbStorage.run(
    {
      client: null,
      createClient: createDb
    },
    run
  );
}

export const db = new Proxy({} as ArrivoDb, {
  get(_target, property, receiver) {
    return Reflect.get(getActiveDb(), property, receiver);
  }
});

function getActiveDb() {
  const scopedDb = dbStorage.getStore();
  if (!scopedDb) {
    throw new Error("Database client is not configured.");
  }
  scopedDb.client ??= scopedDb.createClient();
  return scopedDb.client;
}
