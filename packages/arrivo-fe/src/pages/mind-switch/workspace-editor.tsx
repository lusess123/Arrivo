import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type {
  MindActionDto,
  MindNoteDto,
  MindNoteType,
  MindSwitchChange,
  MindSwitchSnapshot,
  MindTaskDto,
} from "@arrivo/contracts";
import { ExpandableTextField } from "@/components/expandable-text-field";
import { mindSwitchError } from "@/lib/mind-switch-api";
import { ContextFields, readTaskContext } from "./task-editor";
import styles from "./index.module.less";

export const noteTypes = {
  OTHER: "其他",
  IDEA: "想法",
  CONCERN: "担忧",
  INSPIRATION: "灵感",
} satisfies Record<MindNoteType, string>;

export type ActionParent = { kind: "task" | "note"; id: string };

export type WorkspaceEdit =
  | { kind: "focus"; source: MindTaskDto | undefined; target?: MindTaskDto | null }
  | { kind: "note"; note?: MindNoteDto }
  | { kind: "link"; note: MindNoteDto }
  | { kind: "convert"; note: MindNoteDto }
  | { kind: "action"; action?: MindActionDto; parent?: ActionParent; note?: MindNoteDto }
  | { kind: "confirm"; title: string; description: string; change: MindSwitchChange };

function trimmed(form: FormData, field: string) {
  return String(form.get(field) ?? "").trim();
}

export function WorkspaceEditor({
  edit,
  snapshot,
  returnFocus,
  close,
  save,
}: {
  edit: WorkspaceEdit;
  snapshot: MindSwitchSnapshot;
  returnFocus: HTMLElement | null;
  close: () => void;
  save: (input: MindSwitchChange) => Promise<void>;
}) {
  const element = useRef<HTMLFormElement>(null);
  const writing = useRef(false);
  const generatedId = useRef<string>();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const activeTasks = snapshot.tasks.filter((task) => !task.archivedAt);
  const remainingTasks = edit.kind === "focus"
    ? activeTasks.filter((task) => task.id !== edit.source?.id)
    : [];
  const [selectedTaskId, setSelectedTaskId] = useState(() => {
    if (edit.kind !== "focus" || edit.target === null) return "";
    return edit.target?.id ?? remainingTasks[0]?.id ?? "";
  });
  const destination = remainingTasks.find((task) => task.id === selectedTaskId);
  const needsDestination = edit.kind === "focus" && edit.target !== null && !destination;

  useEffect(() => {
    const form = element.current;
    if (!form) return;
    const field = form.querySelector<HTMLElement>("[data-initial-focus]")
      ?? form.querySelector<HTMLElement>("input, select, textarea")
      ?? form;
    field.focus({ preventScroll: true });
    form.scrollIntoView({ block: "nearest" });
  }, []);

  function createId() {
    generatedId.current ??= crypto.randomUUID();
    return generatedId.current;
  }

  function finish() {
    const form = element.current;
    const restore = form && (form.contains(document.activeElement) || document.activeElement === document.body);
    close();
    if (!restore) return;
    requestAnimationFrame(() => {
      // Another editor may already have taken focus while the save was in flight.
      if (document.activeElement !== document.body) return;
      if (returnFocus?.isConnected && returnFocus.getClientRects().length) {
        returnFocus.focus();
      }
      if (document.activeElement === document.body) {
        const heading = document.querySelector<HTMLElement>("main h1");
        if (heading) {
          heading.tabIndex = -1;
          heading.focus();
        }
      }
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (writing.current) return;

    const form = new FormData(event.currentTarget);
    const skip = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "skip";
    try {
      const change = buildChange(form, skip);
      writing.current = true;
      setPending(true);
      setError(null);
      await save(change);
      finish();
    } catch (reason) {
      setError(mindSwitchError(reason));
      writing.current = false;
      setPending(false);
    }
  }

  function buildChange(form: FormData, skip: boolean): MindSwitchChange {
    const title = trimmed(form, "title");
    switch (edit.kind) {
      case "focus": {
        const { lastContext, nextAction } = readTaskContext(form);
        if (needsDestination) throw new Error("请选择可用的任务");
        const taskId = edit.target === null ? null : selectedTaskId;
        const source = edit.source;
        return {
          kind: "focus",
          taskId,
          fromTaskId: source?.id ?? null,
          lastContext: !skip && source && lastContext !== source.lastContext ? lastContext : undefined,
          nextAction: !skip && source && nextAction !== source.nextAction ? nextAction : undefined,
        };
      }
      case "note": {
        const content = String(form.get("content") ?? "");
        const type = form.get("type") as MindNoteType;
        return edit.note
          ? {
              kind: "edit-note", id: edit.note.id,
              content: content !== edit.note.content ? content : undefined,
              type: type !== edit.note.type ? type : undefined,
            }
          : { kind: "create-note", id: createId(), content, type };
      }
      case "link":
        return { kind: "edit-note", id: edit.note.id, taskId: trimmed(form, "taskId") || null };
      case "convert":
        return { kind: "note-to-task", noteId: edit.note.id, taskId: createId(), title };
      case "action": {
        const dueOn = trimmed(form, "dueOn") || null;
        if (edit.action) return {
          kind: "edit-action",
          id: edit.action.id,
          title: title === edit.action.title ? undefined : title,
          dueOn: dueOn === edit.action.dueOn ? undefined : dueOn,
        };
        const [kind, id] = trimmed(form, "parent").split(":");
        const parent = edit.note
          ? { kind: "note" as const, id: edit.note.id }
          : edit.parent ?? { kind: kind as ActionParent["kind"], id };
        return { kind: "create-action", id: createId(), title, dueOn, parent };
      }
      case "confirm":
        return edit.change;
    }
  }

  let heading: string;
  let fields: React.ReactNode;
  let submitLabel = "保存";

  switch (edit.kind) {
    case "focus": {
      const preview = destination?.nextAction || destination?.lastContext;
      if (edit.target === null) {
        heading = "暂时休息";
        submitLabel = "休息一下";
      } else if (edit.source) {
        heading = "切换任务";
        submitLabel = "切换";
      } else {
        heading = "开始专注";
        submitLabel = "开始专注";
      }
      fields = <>
        {edit.target !== null && (
          edit.target
            ? <p className={styles.editorTarget}>{destination?.title ?? "这项任务已不可用，请取消后重新选择。"}</p>
            : <label>切换到
                <select
                  aria-label="切换到"
                  name="taskId"
                  value={destination?.id ?? ""}
                  onChange={(event) => setSelectedTaskId(event.target.value)}
                  required
                  data-initial-focus
                >
                  {!destination && <option value="" disabled>
                    {remainingTasks.length ? "原任务已不可用，请重新选择" : "没有其他可切换的任务"}
                  </option>}
                  {remainingTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
                </select>
              </label>
        )}
        {preview && <div className={styles.switchPreview} aria-live="polite">
          <strong>{destination?.nextAction ? "回来先做" : "上次进度"}</strong>
          <p>{preview}</p>
        </div>}
        {edit.source && <>
          <p>离开「{edit.source.title}」前，可以留一点上下文。</p>
          <ContextFields task={edit.source} />
        </>}
      </>;
      break;
    }
    case "note":
      heading = edit.note ? "编辑记录" : "快速记录";
      fields = <>
        <label>此刻想到什么？
          <ExpandableTextField name="content" maxLength={12000} defaultValue={edit.note?.content} required data-initial-focus />
        </label>
        <label>类型（可选）
          <select aria-label="记录类型" name="type" defaultValue={edit.note?.type ?? "OTHER"}>
            {Object.entries(noteTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </>;
      break;
    case "link":
      heading = "关联任务";
      fields = <label>任务
        <select aria-label="任务" name="taskId" defaultValue={edit.note.taskId ?? ""} data-initial-focus>
          <option value="">独立记录</option>
          {activeTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
          {snapshot.tasks.filter((task) => task.archivedAt && task.id === edit.note.taskId).map((task) => (
            <option key={task.id} value={task.id} disabled>{task.title}（已归档）</option>
          ))}
        </select>
      </label>;
      break;
    case "convert":
      heading = "转为新任务";
      submitLabel = "创建任务";
      fields = <>
        <label>任务名称
          <ExpandableTextField name="title" defaultValue={edit.note.content.trim().slice(0, 160)} required data-initial-focus />
        </label>
        <p>原始记录会保留，并关联到新任务。</p>
      </>;
      break;
    case "action":
      heading = edit.action ? "编辑行动" : edit.note ? "转为行动" : "添加行动";
      fields = <>
        {!edit.action && !edit.parent && !edit.note && <label>所属任务或记录
          <select aria-label="所属任务或记录" name="parent" required defaultValue="">
            <option value="" disabled>请选择</option>
            <optgroup label="任务">
              {activeTasks.map((task) => <option key={task.id} value={`task:${task.id}`}>{task.title}</option>)}
            </optgroup>
            <optgroup label="暂存记录">
              {snapshot.notes.map((note) => <option key={note.id} value={`note:${note.id}`}>{note.content.slice(0, 60)}</option>)}
            </optgroup>
          </select>
        </label>}
        <label>下一小步
          <input
            name="title"
            maxLength={160}
            defaultValue={edit.action?.title ?? edit.note?.content.trim().split(/\r?\n/)[0].slice(0, 160)}
            required
            data-initial-focus
          />
        </label>
        <label>计划日期（可选）
          <input name="dueOn" type="date" min="0001-01-01" max="9999-12-31" defaultValue={edit.action?.dueOn ?? undefined} />
        </label>
      </>;
      break;
    case "confirm":
      heading = edit.title;
      fields = <p>{edit.description}</p>;
      submitLabel = "确认删除";
      break;
  }

  return (
    <form
      ref={element}
      className={styles.workspaceEditor}
      aria-labelledby="mind-editor-title"
      aria-busy={pending}
      tabIndex={-1}
      onSubmit={submit}
    >
      <h2 id="mind-editor-title">{heading}</h2>
      <fieldset disabled={pending}>
        <div className={styles.fields}>{fields}</div>
        {error && <p role="alert" className={styles.formError}>{error}</p>}
        <div className={styles.buttons}>
          <button type="button" onClick={finish}>取消</button>
          {edit.kind === "focus" && edit.source && (
            <button type="submit" value="skip" disabled={needsDestination}>跳过备注</button>
          )}
          <button type="submit" disabled={needsDestination} className={edit.kind === "confirm" ? styles.danger : styles.primary}>
            {pending ? "处理中…" : submitLabel}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
