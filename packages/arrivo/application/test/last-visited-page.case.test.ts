import { describe, expect, test } from "bun:test";
import type { ArrivoDb } from "@arrivo/db";
import {
  getLastVisitedPage,
  runWithDbClientFactory,
  updateLastVisitedPage,
} from "../src";

function withDb<T>(mockDb: Partial<ArrivoDb>, run: () => T) {
  return runWithDbClientFactory({ createDb: () => mockDb as ArrivoDb, run });
}

describe("last visited page", () => {
  test("loads only the current user's tenant-scoped page", async () => {
    let where: any;
    const result = await withDb(
      {
        config: {
          findFirst: async (args: any) => {
            where = args.where;
            return {
              value: JSON.stringify({
                path: "/article/article-a?tab=notes#sentence-2",
              }),
            };
          },
        },
      } as Partial<ArrivoDb>,
      () => getLastVisitedPage({ userId: "user-a", tenantId: "tenant-a" }),
    );

    expect(result).toBe("/article/article-a?tab=notes#sentence-2");
    expect(where).toEqual({
      tenantId: "tenant-a",
      deletedAt: null,
      key: "user-last-visited-page:user-a",
    });
  });

  test("ignores a malformed or unsafe stored page", async () => {
    const result = await withDb(
      {
        config: {
          findFirst: async () => ({
            value: JSON.stringify({ path: "https://example.com" }),
          }),
        },
      } as Partial<ArrivoDb>,
      () => getLastVisitedPage({ userId: "user-a", tenantId: "tenant-a" }),
    );

    expect(result).toBeNull();
  });

  test("upserts the current user's page with audit fields", async () => {
    let upsertArgs: any;
    const result = await withDb(
      {
        config: {
          upsert: async (args: any) => {
            upsertArgs = args;
            return {};
          },
        },
      } as Partial<ArrivoDb>,
      () =>
        updateLastVisitedPage({
          userId: "user-a",
          tenantId: "tenant-a",
          input: { path: "/article/article-a?tab=notes#sentence-2" },
        }),
    );

    expect(result).toBe("/article/article-a?tab=notes#sentence-2");
    expect(upsertArgs.where).toEqual({
      tenantId_key: {
        tenantId: "tenant-a",
        key: "user-last-visited-page:user-a",
      },
    });
    expect(JSON.parse(upsertArgs.create.value)).toEqual({
      path: "/article/article-a?tab=notes#sentence-2",
    });
    expect(upsertArgs.create.createdBy).toBe("user-a");
    expect(upsertArgs.update.updatedBy).toBe("user-a");
  });
});
