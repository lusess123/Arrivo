import { describe, expect, test } from "bun:test";
import type { ApiSuccess, MindSwitchChange, MindSwitchSnapshot } from "@arrivo/contracts";
import { signUserJwt } from "@arrivo/runtime";
import type { AppEnv } from "../src/context";
import { createApiApp } from "../src/app-factory";

const app = createApiApp();
const path = "http://localhost/api/mind-switch";
const env = { JWT_SECRET: "mind-switch-test", WEB_ORIGIN: "http://localhost" } as AppEnv["Bindings"];

async function session(tenant = "mind-switch-test", id = crypto.randomUUID(), secret = env.JWT_SECRET) {
  const user = { id, name: "Test", role: "user" as const, tenant };
  const token = await signUserJwt({ user, secret, expiresSeconds: 300 });
  return { accountId: id, cookie: `Authentication=${token}` };
}

describe("MindSwitch routes", () => {
  test("rejects unauthenticated reads and marks private responses no-store", async () => {
    const response = await app.request(path, undefined, env);
    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  test("validates mutations without echoing private input", async () => {
    const user = await session();
    const response = await app.request(path, {
      method: "POST",
      headers: { Cookie: user.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: user.accountId, change: { kind: "create-note", id: "invalid", content: "private fixture" } }),
    }, env);
    expect(response.status).toBe(400);
    expect(await response.text()).not.toContain("private fixture");
  });

  test("rejects a mutation from a form opened under another account", async () => {
    const user = await session();
    const response = await app.request(path, {
      method: "POST",
      headers: { Cookie: user.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: crypto.randomUUID(), change: { kind: "clear-workspace" } }),
    }, env);
    expect(response.status).toBe(409);
  });
});

const testOrigin = process.env.MIND_SWITCH_TEST_ORIGIN;

test.skipIf(!testOrigin)("MindSwitch keeps focus, notes and account data consistent in PostgreSQL", async () => {
  const origin = new URL(testOrigin!);
  const secret = process.env.MIND_SWITCH_TEST_JWT;
  if (!["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname) || !secret) {
    throw new Error("Set a loopback Worker URL and its local test signing secret");
  }

  const user = await session("mind-switch-test", crypto.randomUUID(), secret);
  const other = await session("mind-switch-test", crypto.randomUUID(), secret);
  const otherTenant = await session("another-mind-switch-tenant", user.accountId, secret);
  const send = (
    actor: Awaited<ReturnType<typeof session>>,
    change?: MindSwitchChange,
    revision?: string,
  ) => {
    const url = new URL("/api/mind-switch", origin);
    if (revision) url.searchParams.set("revision", revision);
    return fetch(url, {
      method: change ? "POST" : "GET",
      headers: { Cookie: actor.cookie, "Content-Type": "application/json" },
      body: change ? JSON.stringify({ accountId: actor.accountId, change }) : undefined,
    });
  };

  const write = async (change: MindSwitchChange) => {
    expect((await send(user, change)).status).toBe(200);
  };
  async function read(actor = user, revision?: string) {
    const response = await send(actor, undefined, revision);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const result: ApiSuccess<{ snapshot: MindSwitchSnapshot | null }> = await response.json();
    return result.data.snapshot;
  }

  const initialTask = crypto.randomUUID();
  const taskB = crypto.randomUUID();
  const taskC = crypto.randomUUID();
  const noteId = crypto.randomUUID();
  const actionId = crypto.randomUUID();
  const converted = crypto.randomUUID();

  try {
    for (const id of [initialTask, taskB, taskC]) await write({ kind: "create-task", id, title: id });
    await write({ kind: "focus", taskId: initialTask, fromTaskId: null });
    await write({ kind: "edit-task", id: initialTask, status: "WAITING" });

    const competing = await Promise.all([
      send(user, { kind: "focus", taskId: taskB, fromTaskId: initialTask, lastContext: "Version B" }),
      send(user, { kind: "focus", taskId: taskC, fromTaskId: initialTask, lastContext: "Version C" }),
    ]);
    expect(competing.map((response) => response.status).sort()).toEqual([200, 409]);
    const [expectedFocus, expectedContext] = competing[0].status === 200
      ? [taskB, "Version B"] : [taskC, "Version C"];
    expect((await send(user, {
      kind: "focus", taskId: expectedFocus, fromTaskId: initialTask, lastContext: "New unsaved context",
    })).status).toBe(409);
    await write({ kind: "focus", taskId: expectedFocus, fromTaskId: initialTask, lastContext: expectedContext });
    const focused = (await read())!;
    expect(focused.currentTaskId).toBe(expectedFocus);
    expect(focused.tasks.find(({ id }) => id === initialTask)).toMatchObject({
      status: "WAITING",
      lastContext: expectedContext,
    });
    expect(await read(user, focused.revision)).toBeNull();

    await write({ kind: "create-note", id: noteId, content: "Original note" });
    await write({ kind: "create-note", id: noteId, content: "Retried request" });
    await write({ kind: "edit-note", id: noteId, setAside: true });
    await write({
      kind: "create-action", id: actionId, title: "Read note", dueOn: null,
      parent: { kind: "note", id: noteId },
    });
    await write({ kind: "edit-action", id: actionId, dueOn: "2026-12-01", done: true });
    await write({ kind: "note-to-task", noteId, taskId: converted, title: "Converted task" });
    expect((await read())!.notes[0]).toMatchObject({ content: "Original note", taskId: converted, setAside: true });
    await write({ kind: "delete-task", id: converted });
    await write({ kind: "archive-task", id: expectedFocus, archived: true });
    const after = (await read())!;
    expect(after.currentTaskId).toBeNull();
    expect(after.notes[0]).toMatchObject({ content: "Original note", taskId: null });
    expect(after.actions[0]).toMatchObject({ noteId, dueOn: "2026-12-01", done: true });
    for (const actor of [other, otherTenant]) {
      expect(await read(actor)).toMatchObject({ tasks: [], notes: [], actions: [], currentTaskId: null });
      expect((await send(actor, { kind: "edit-note", id: noteId, content: "not my note" })).status).toBe(404);
      expect((await send(actor, { kind: "focus", taskId: initialTask, fromTaskId: null })).status).toBe(404);
    }

    await write({ kind: "clear-workspace" });
    expect(await read()).toMatchObject({ tasks: [], notes: [], actions: [], currentTaskId: null });
  } finally {
    await send(user, { kind: "clear-workspace" });
  }
}, 15000);
