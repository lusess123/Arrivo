import { describe, expect, test } from "bun:test";
import type { ArrivoDb } from "@arrivo/db";
import { getArticleDetail, getArticleList, incrementArticlePlayCount, runWithDbClientFactory } from "../src";

function withDb<T>(mockDb: Partial<ArrivoDb>, run: () => T) {
  return runWithDbClientFactory({
    createDb: () => mockDb as ArrivoDb,
    run
  });
}

const createdAt = new Date("2026-07-16T10:00:00.000Z");
const article = {
  id: "019f-next-current",
  title: "Current",
  userId: "user-a",
  isPublic: false,
  createdAt,
  updatedAt: createdAt,
  Sentences: []
};

describe("article navigation", () => {
  test("increments an accessible article play count atomically", async () => {
    let updateArgs: any;
    const articles = {
      findFirst: async () => ({ id: article.id }),
      update: async (args: any) => {
        updateArgs = args;
        return { playCount: 8 };
      }
    };

    const result = await withDb({ articles } as Partial<ArrivoDb>, () =>
      incrementArticlePlayCount({ userId: "user-a", tenantId: "tenant-a", id: article.id })
    );

    expect(result).toEqual({ playCount: 8 });
    expect(updateArgs).toEqual({
      where: { id: article.id },
      data: { playCount: { increment: 1 } },
      select: { playCount: true }
    });
  });

  test("does not increment an inaccessible article", async () => {
    let writes = 0;
    const articles = {
      findFirst: async () => null,
      update: async () => {
        writes += 1;
      }
    };

    await expect(withDb({ articles } as Partial<ArrivoDb>, () =>
      incrementArticlePlayCount({ userId: "user-a", tenantId: "tenant-a", id: "private" })
    )).rejects.toMatchObject({ status: 404 });
    expect(writes).toBe(0);
  });

  test("uses a stable createdAt/id order for the article list", async () => {
    let args: any;
    const articles = {
      findMany: async (input: any) => {
        args = input;
        return [];
      }
    };

    await withDb({ articles } as Partial<ArrivoDb>, () =>
      getArticleList({ userId: "user-a", tenantId: "tenant-a" })
    );

    expect(args.orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
  });

  test("returns the next accessible article in the same tenant and list order", async () => {
    const calls: any[] = [];
    const articles = {
      findFirst: async (args: any) => {
        calls.push(args);
        return calls.length === 1 ? article : { id: "019f-next-previous" };
      }
    };

    const result = await withDb({ articles } as Partial<ArrivoDb>, () =>
      getArticleDetail({ userId: "user-a", tenantId: "tenant-a", id: article.id })
    );

    expect(result?.nextArticleId).toBe("019f-next-previous");
    expect(calls[0].where).toEqual({
      id: article.id,
      tenantId: "tenant-a",
      deletedAt: null,
      OR: [{ userId: "user-a" }, { isPublic: true }]
    });
    expect(calls[1].where.tenantId).toBe("tenant-a");
    expect(calls[1].where.deletedAt).toBeNull();
    expect(calls[1].where.AND[0]).toEqual({ OR: [{ userId: "user-a" }, { isPublic: true }] });
    expect(calls[1].where.AND[1]).toEqual({
      OR: [
        { createdAt: { lt: createdAt } },
        { createdAt, id: { lt: article.id } }
      ]
    });
    expect(calls[1].orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
  });

  test("returns null without looking up a next article when the article is inaccessible", async () => {
    let calls = 0;
    const articles = {
      findFirst: async () => {
        calls += 1;
        return null;
      }
    };

    const result = await withDb({ articles } as Partial<ArrivoDb>, () =>
      getArticleDetail({ userId: "user-a", tenantId: "tenant-a", id: "missing" })
    );

    expect(result).toBeNull();
    expect(calls).toBe(1);
  });

  test("walks only visible active articles and resolves same-time ids deterministically", async () => {
    const rows = [
      { ...article, id: "current-z", tenantId: "tenant-a" },
      { ...article, id: "current-y", title: "Same time", tenantId: "tenant-a" },
      {
        ...article,
        id: "public-old",
        title: "Public old",
        userId: "user-b",
        isPublic: true,
        createdAt: new Date("2026-07-15T10:00:00.000Z"),
        tenantId: "tenant-a"
      },
      {
        ...article,
        id: "private-old",
        userId: "user-b",
        createdAt: new Date("2026-07-14T10:00:00.000Z"),
        tenantId: "tenant-a"
      },
      {
        ...article,
        id: "deleted-own",
        createdAt: new Date("2026-07-13T10:00:00.000Z"),
        deletedAt: new Date("2026-07-16T11:00:00.000Z"),
        tenantId: "tenant-a"
      },
      {
        ...article,
        id: "other-tenant",
        createdAt: new Date("2026-07-12T10:00:00.000Z"),
        tenantId: "tenant-b"
      }
    ];
    const articles = {
      findFirst: async (args: any) => {
        const visibleRows = rows.filter((row) =>
          row.tenantId === args.where.tenantId
          && !row.deletedAt
          && (row.userId === "user-a" || row.isPublic)
        );

        if (args.where.id) {
          return visibleRows.find((row) => row.id === args.where.id) ?? null;
        }

        const cursor = args.where.AND[1].OR;
        const cursorDate = cursor[0].createdAt.lt as Date;
        const cursorId = cursor[1].id.lt as string;
        return visibleRows
          .filter((row) => row.createdAt < cursorDate || (row.createdAt.getTime() === cursorDate.getTime() && row.id < cursorId))
          .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime() || right.id.localeCompare(left.id))[0] ?? null;
      }
    };

    const current = await withDb({ articles } as Partial<ArrivoDb>, () =>
      getArticleDetail({ userId: "user-a", tenantId: "tenant-a", id: "current-z" })
    );
    const sameTime = await withDb({ articles } as Partial<ArrivoDb>, () =>
      getArticleDetail({ userId: "user-a", tenantId: "tenant-a", id: "current-y" })
    );
    const lastVisible = await withDb({ articles } as Partial<ArrivoDb>, () =>
      getArticleDetail({ userId: "user-a", tenantId: "tenant-a", id: "public-old" })
    );

    expect(current?.nextArticleId).toBe("current-y");
    expect(sameTime?.nextArticleId).toBe("public-old");
    expect(lastVisible?.nextArticleId).toBeNull();
  });
});
