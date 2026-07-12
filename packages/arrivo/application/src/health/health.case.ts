import { db } from "../runtime/db";

export async function checkDatabaseHealth() {
  await db.$queryRawUnsafe("select 1 as ok");
  return { ok: true };
}
