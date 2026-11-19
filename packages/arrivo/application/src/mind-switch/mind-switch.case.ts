import type { AuthUserDto, MindSwitchChange, MindSwitchSnapshot } from "@arrivo/contracts";
import { HttpError, httpError } from "@arrivo/runtime";
import { db } from "../runtime/db";
import { getUserTenantId } from "../runtime/data-scope";

type Owner = Pick<AuthUserDto, "id" | "tenant">;
type Transaction = Parameters<Parameters<typeof db.$transaction>[0]>[0];

function ownerWhere(user: Owner) {
  return { tenantId: getUserTenantId(user), userId: user.id };
}

export async function readMindSwitch(user: Owner, knownRevision?: string): Promise<MindSwitchSnapshot | null> {
  const owner = ownerWhere(user);
  return db.$transaction(async (transaction) => {
    const workspace = await transaction.mindWorkspace.findUnique({
      where: { tenantId_userId: owner },
      select: { currentTaskId: true, revision: true },
    });
    const revision = workspace?.revision ?? "empty";
    if (knownRevision === revision) return null;

    const [tasks, notes, actions] = await Promise.all([
      transaction.mindTask.findMany({
        where: owner,
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        select: {
          id: true, title: true, status: true, lastContext: true, nextAction: true,
          archivedAt: true, createdAt: true, updatedAt: true,
        },
      }),
      transaction.mindNote.findMany({
        where: owner,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        select: { id: true, content: true, type: true, taskId: true, setAside: true, createdAt: true },
      }),
      transaction.mindAction.findMany({
        where: owner,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true, title: true, dueOn: true, done: true, taskId: true, noteId: true, createdAt: true },
      }),
    ]);

    return {
      accountId: user.id,
      revision,
      currentTaskId: workspace?.currentTaskId ?? null,
      tasks: tasks.map((task) => ({
        ...task,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
        archivedAt: task.archivedAt?.toISOString() ?? null,
      })),
      notes: notes.map((note) => ({ ...note, createdAt: note.createdAt.toISOString() })),
      actions: actions.map((action) => ({
        ...action,
        createdAt: action.createdAt.toISOString(),
        dueOn: action.dueOn?.toISOString().slice(0, 10) ?? null,
      })),
    };
  }, { isolationLevel: "RepeatableRead" });
}

function notFoundUnlessChanged(result: { count: number }) {
  if (!result.count) throw httpError.notFound();
}

function toDate(value: string | null | undefined) {
  if (value == null) return value;
  return new Date(`${value}T00:00:00.000Z`);
}

async function requireActiveTask(transaction: Transaction, owner: ReturnType<typeof ownerWhere>, id: string) {
  const task = await transaction.mindTask.findFirst({
    where: { ...owner, id, archivedAt: null },
    select: { id: true },
  });
  if (!task) throw httpError.notFound("任务已归档或不存在");
}

export async function changeMindSwitch(user: Owner, change: MindSwitchChange) {
  const owner = ownerWhere(user);

  return db.$transaction(async (transaction) => {
    // Updating the workspace row holds the account lock until the write commits.
    const [workspace] = await transaction.$queryRaw<{ currentTaskId: string | null }[]>`
      INSERT INTO "MindWorkspace" ("tenantId", "userId", "revision")
      VALUES (${owner.tenantId}, ${owner.userId}::uuid, ${crypto.randomUUID()}::uuid)
      ON CONFLICT ("tenantId", "userId") DO UPDATE SET "revision" = EXCLUDED."revision"
      RETURNING "currentTaskId"
    `;
    const setFocus = (currentTaskId: string | null) => transaction.mindWorkspace.update({
      where: { tenantId_userId: owner },
      data: { currentTaskId },
    });

    switch (change.kind) {
      case "create-task":
        await transaction.mindTask.createMany({
          data: { ...owner, id: change.id, title: change.title },
          skipDuplicates: true,
        });
        break;

      case "edit-task": {
        const { kind, id, ...data } = change;
        notFoundUnlessChanged(await transaction.mindTask.updateMany({ where: { ...owner, id }, data }));
        break;
      }

      case "focus": {
        const hasContext = change.lastContext !== undefined || change.nextAction !== undefined;
        if (workspace.currentTaskId !== change.fromTaskId) {
          if (workspace.currentTaskId === change.taskId) {
            if (!hasContext) break;
            // A retry is successful only if the requested context was actually saved.
            const saved = change.fromTaskId && await transaction.mindTask.findFirst({
              where: {
                ...owner,
                id: change.fromTaskId,
                lastContext: change.lastContext,
                nextAction: change.nextAction,
              },
              select: { id: true },
            });
            if (saved) break;
          }
          throw new HttpError({
            status: 409,
            code: "FOCUS_CHANGED",
            message: "焦点已在其他设备切换。你的备注仍在这个窗口，请核对后重新发起切换。",
          });
        }
        if (workspace.currentTaskId === change.taskId) break;
        if (change.taskId) await requireActiveTask(transaction, owner, change.taskId);
        if (change.fromTaskId && hasContext) {
          await transaction.mindTask.updateMany({
            where: { ...owner, id: change.fromTaskId },
            data: { lastContext: change.lastContext, nextAction: change.nextAction },
          });
        }
        await setFocus(change.taskId);
        break;
      }

      case "archive-task":
        notFoundUnlessChanged(await transaction.mindTask.updateMany({
          where: { ...owner, id: change.id },
          data: { archivedAt: change.archived ? new Date() : null },
        }));
        if (change.archived && workspace.currentTaskId === change.id) await setFocus(null);
        break;

      case "delete-task":
        if (workspace.currentTaskId === change.id) await setFocus(null);
        await transaction.mindNote.updateMany({
          where: { ...owner, taskId: change.id },
          data: { taskId: null },
        });
        await transaction.mindTask.deleteMany({ where: { ...owner, id: change.id } });
        break;

      case "create-note":
        await transaction.mindNote.createMany({
          data: { ...owner, id: change.id, content: change.content, type: change.type },
          skipDuplicates: true,
        });
        break;

      case "edit-note": {
        const { kind, id, ...data } = change;
        if (data.taskId) await requireActiveTask(transaction, owner, data.taskId);
        notFoundUnlessChanged(await transaction.mindNote.updateMany({ where: { ...owner, id }, data }));
        break;
      }

      case "note-to-task": {
        const note = await transaction.mindNote.findUnique({
          where: { tenantId_userId_id: { ...owner, id: change.noteId } },
          select: { content: true, taskId: true },
        });
        if (!note) throw httpError.notFound();
        if (note.taskId === change.taskId) break;
        await transaction.mindTask.createMany({
          data: { ...owner, id: change.taskId, title: change.title, lastContext: note.content },
          skipDuplicates: true,
        });
        await transaction.mindNote.update({
          where: { tenantId_userId_id: { ...owner, id: change.noteId } },
          data: { taskId: change.taskId },
        });
        break;
      }

      case "delete-note":
        await transaction.mindNote.deleteMany({ where: { ...owner, id: change.id } });
        break;

      case "create-action": {
        const parent = change.parent;
        if (parent.kind === "task") {
          await requireActiveTask(transaction, owner, parent.id);
        } else {
          const note = await transaction.mindNote.findUnique({
            where: { tenantId_userId_id: { ...owner, id: parent.id } },
            select: { id: true },
          });
          if (!note) throw httpError.notFound();
        }
        await transaction.mindAction.createMany({
          data: {
            ...owner, id: change.id, title: change.title, dueOn: toDate(change.dueOn),
            ...(parent.kind === "task" ? { taskId: parent.id } : { noteId: parent.id }),
          },
          skipDuplicates: true,
        });
        break;
      }

      case "edit-action": {
        const { kind, id, dueOn, ...data } = change;
        notFoundUnlessChanged(await transaction.mindAction.updateMany({
          where: { ...owner, id },
          data: { ...data, dueOn: toDate(dueOn) },
        }));
        break;
      }

      case "delete-action":
        await transaction.mindAction.deleteMany({ where: { ...owner, id: change.id } });
        break;

      case "clear-workspace":
        await setFocus(null);
        await transaction.mindNote.deleteMany({ where: owner });
        await transaction.mindTask.deleteMany({ where: owner });
        break;
    }
  });
}
