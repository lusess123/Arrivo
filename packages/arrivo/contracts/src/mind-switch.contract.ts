import { z } from "zod";

export const mindTaskStatuses = ["IN_PROGRESS", "WAITING", "PAUSED", "DONE"] as const;
export const mindNoteTypes = ["IDEA", "CONCERN", "INSPIRATION", "OTHER"] as const;

export type MindTaskStatus = (typeof mindTaskStatuses)[number];
export type MindNoteType = (typeof mindNoteTypes)[number];

const id = z.string().uuid();
const title = z.string().trim().min(1).max(160);
const context = z.string().max(12000).nullable();
const details = z.string().max(4000).nullable();
const content = z.string().max(12000).refine((value) => !!value.trim());
const status = z.enum(mindTaskStatuses);
const noteType = z.enum(mindNoteTypes);
const date = z.string()
  .date()
  .refine((value) => !value.startsWith("0000-"), "年份须大于零")
  .nullable();

export const mindSwitchRevisionSchema = z.object({
  revision: id.or(z.literal("empty")).optional(),
});

export const mindSwitchChangeSchema = z.object({
  accountId: id,
  change: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("create-task"), id, title }),
    z.object({
      kind: z.literal("edit-task"),
      id,
      title: title.optional(),
      status: status.optional(),
      lastContext: context.optional(),
      nextAction: details.optional(),
    }),
    z.object({ kind: z.literal("archive-task"), id, archived: z.boolean() }),
    z.object({ kind: z.literal("delete-task"), id }),
    z.object({
      kind: z.literal("focus"),
      taskId: id.nullable(),
      fromTaskId: id.nullable(),
      lastContext: context.optional(),
      nextAction: details.optional(),
    }),
    z.object({ kind: z.literal("create-note"), id, content, type: noteType.optional() }),
    z.object({
      kind: z.literal("edit-note"),
      id,
      content: content.optional(),
      type: noteType.optional(),
      setAside: z.boolean().optional(),
      taskId: id.nullable().optional(),
    }),
    z.object({ kind: z.literal("note-to-task"), noteId: id, taskId: id, title }),
    z.object({ kind: z.literal("delete-note"), id }),
    z.object({
      kind: z.literal("create-action"), id, title, dueOn: date,
      parent: z.object({ kind: z.enum(["task", "note"]), id }),
    }),
    z.object({
      kind: z.literal("edit-action"),
      id,
      title: title.optional(),
      dueOn: date.optional(),
      done: z.boolean().optional(),
    }),
    z.object({ kind: z.literal("delete-action"), id }),
    z.object({ kind: z.literal("clear-workspace") }),
  ]),
});

export type MindSwitchChange = z.infer<typeof mindSwitchChangeSchema>["change"];

export interface MindTaskDto {
  id: string;
  title: string;
  status: MindTaskStatus;
  lastContext: string | null;
  nextAction: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MindNoteDto {
  id: string;
  content: string;
  type: MindNoteType;
  taskId: string | null;
  setAside: boolean;
  createdAt: string;
}

export interface MindActionDto {
  id: string;
  title: string;
  taskId: string | null;
  noteId: string | null;
  dueOn: string | null;
  done: boolean;
  createdAt: string;
}

export interface MindSwitchSnapshot {
  accountId: string;
  revision: string;
  currentTaskId: string | null;
  tasks: MindTaskDto[];
  notes: MindNoteDto[];
  actions: MindActionDto[];
}
