import type { ArrivoWorkerEnv } from "./env";

export function getDatabaseConnectionString(env: Pick<ArrivoWorkerEnv, "DATABASE_URL" | "HYPERDRIVE">) {
  const connectionString = env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL or HYPERDRIVE binding is required.");
  }
  return connectionString;
}
