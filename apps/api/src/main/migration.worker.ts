import { createDb } from "@arrivo/db";

type Env = {
  HYPERDRIVE: { connectionString: string };
  MIGRATION_TOKEN: string;
};

const MIGRATION_NAME = "20260717130000_add_article_play_count";
const MIGRATION_CHECKSUM = "836ebe3620733409d83faba8d9150a4496f44da42d519f53eee1fd2e0766d21e";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.headers.get("authorization") !== `Bearer ${env.MIGRATION_TOKEN}`) {
      return new Response("Not found", { status: 404 });
    }

    const db = createDb({ connectionString: env.HYPERDRIVE.connectionString });

    try {
      await db.$executeRawUnsafe(
        'ALTER TABLE "Articles" ADD COLUMN IF NOT EXISTS "playCount" INTEGER NOT NULL DEFAULT 0'
      );

      const applied = await db.$queryRawUnsafe<Array<{ applied: boolean }>>(
        'SELECT EXISTS(SELECT 1 FROM "_prisma_migrations" WHERE migration_name = $1) AS applied',
        MIGRATION_NAME
      );

      if (!applied[0]?.applied) {
        await db.$executeRawUnsafe(
          `INSERT INTO "_prisma_migrations"
            (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
           VALUES ($1, $2, NOW(), $3, NULL, NULL, NOW(), 1)`,
          crypto.randomUUID(),
          MIGRATION_CHECKSUM,
          MIGRATION_NAME
        );
      }

      return Response.json({ ok: true, migration: MIGRATION_NAME });
    } finally {
      await db.$disconnect();
    }
  }
};
