import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma-worker/client";

export type ArrivoDb = PrismaClient;

type CreateDbInput = {
  connectionString: string;
  schema?: string;
};

export function createDb({ connectionString, schema = "public" }: CreateDbInput): ArrivoDb {
  const adapter = new PrismaPg(
    {
      connectionString,
      max: 1,
      maxUses: 1
    },
    { schema }
  );
  return new PrismaClient({ adapter });
}

export type { PrismaClient };
