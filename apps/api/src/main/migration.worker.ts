import { createDb } from "@arrivo/db";

type Env = {
  HYPERDRIVE: { connectionString: string };
  MIGRATION_TOKEN: string;
  TARGET_DATABASE_URL: string;
};

const TABLES = ["User", "Articles", "Sentences", "Config", "UserPassword", "PhoneCode", "EmailCode"] as const;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.headers.get("authorization") !== `Bearer ${env.MIGRATION_TOKEN}`) {
      return new Response("Not found", { status: 404 });
    }

    const source = createDb({ connectionString: env.HYPERDRIVE.connectionString });
    const target = createDb({ connectionString: env.TARGET_DATABASE_URL });

    try {
      const targetRows = await target.$queryRawUnsafe<Array<{ count: bigint }>>(
        'SELECT COUNT(*)::bigint AS count FROM "User"'
      );
      if (targetRows[0]?.count !== 0n) {
        return Response.json({ ok: false, error: "TARGET_NOT_EMPTY" }, { status: 409 });
      }

      const rowsByTable = await Promise.all(
        TABLES.map((table) => source.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT * FROM "${table}"`))
      );
      const articles = rowsByTable[1].map((row) => ({ ...row, playCount: row.playCount ?? 0 }));
      rowsByTable[1] = articles;

      await target.$transaction(
        TABLES.map((table, index) => {
          const rows = rowsByTable[index];
          if (!rows.length) return target.$executeRawUnsafe("SELECT 1");
          return target.$executeRawUnsafe(
            `INSERT INTO "${table}" SELECT * FROM json_populate_recordset(NULL::"${table}", $1::json)`,
            JSON.stringify(rows)
          );
        })
      );

      return Response.json({
        ok: true,
        counts: Object.fromEntries(TABLES.map((table, index) => [table, rowsByTable[index].length]))
      });
    } finally {
      await Promise.all([source.$disconnect(), target.$disconnect()]);
    }
  }
};
