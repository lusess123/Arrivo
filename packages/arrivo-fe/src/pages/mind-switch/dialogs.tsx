import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type {
  MindActionDto,
  MindNoteDto,
  MindNoteType,
  MindSwitchChange,
  MindSwitchSnapshot,
  MindTaskDto,
  MindTaskStatus,
} from "@arrivo/contracts";
import { CloseOutlined } from "@ant-design/icons";
import { mindSwitchError } from "./use-mind-switch";
import styles from "./index.module.less";

export const taskStatuses = {
  IN_PROGRESS: "进行中",
  WAITING: "等待中",
  PAUSED: "暂停",
  DONE: "完成",
} satisfies Record<MindTaskStatus, string>;

export const noteTypes = {
  OTHER: "其他",
  IDEA: "想法",
  CONCERN: "担忧",
  INSPIRATION: "灵感",
} satisfies Record<MindNoteType, string>;

export type ActionParent = { kind: "task" | "note"; id: string };

export type MindDialog =
  | { kind: "task"; task?: MindTaskDto }
  | { kind: "focus"; source: MindTaskDto | undefined; target?: MindTaskDto | null }
  | { kind: "note"; note?: MindNoteDto }
  | { kind: "link"; note: MindNoteDto }
  | { kind: "convert"; note: MindNoteDto }
  | { kind: "action"; action?: MindActionDto; parent?: ActionParent; note?: MindNoteDto }
  | { kind: "confirm"; title: string; description: string; change: MindSwitchChange };

function trimmed(form: FormData, field: string) {
  return String(form.get(field) ?? "").trim();
}

export function Dialog({
  dialog,
  snapshot,
  close,
  save,
}: {
  dialog: MindDialog;
  snapshot: MindSwitchSnapshot;
  close: () => void;
  save: (input: MindSwitchChange) => Promise<void>;
}) {
  const element = useRef<HTMLDialogElement>(null);
  const writing = useRef(false);
  const generatedId = useRef<string>();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const activeTasks = snapshot.tasks.filter((task) => !task.archivedAt);
  const remainingTasks = dialog.kind === "focus"
    ? activeTasks.filter((task) => task.id !== dialog.source?.id)
    : [];

  useEffect(() => {
    const current = element.current;
    current?.showModal();
    current?.querySelector<HTMLElement>("[data-initial-focus]")?.focus();
    return () => current?.close();
  }, []);

  function createId() {
    generatedId.current ??= crypto.randomUUID();
    return generatedId.current;
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
      close();
    } catch (reason) {
      setError(mindSwitchError(reason));
      writing.current = false;
      setPending(false);
    }
  }

  function buildChange(form: FormData, skip: boolean): MindSwitchChange {
    const title = trimmed(form, "title");
    const contextText = String(form.get("lastContext") ?? "");
    const actionText = String(form.get("nextAction") ?? "");
    const lastContext = contextText.trim() ? contextText : null;
    const nextAction = actionText.trim() ? actionText : null;
    switch (dialog.kind) {
      case "task":
        if (!dialog.task) return { kind: "create-task", id: createId(), title };
        return {
          kind: "edit-task",
          id: dialog.task.id,
          title: title === dialog.task.title ? undefined : title,
          status: form.get("status") === dialog.task.status ? undefined : form.get("status") as MindTaskStatus,
          lastContext: lastContext === dialog.task.lastContext ? undefined : lastContext,
          nextAction: nextAction === dialog.task.nextAction ? undefined : nextAction,
        };
      case "focus": {
        const taskId = dialog.target === null ? null : dialog.target?.id ?? trimmed(form, "taskId");
        if (taskId === "") throw new Error("请选择要切换的任务");
        const source = dialog.source;
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
        return dialog.note
          ? {
              kind: "edit-note", id: dialog.note.id,
              content: content !== dialog.note.content ? content : undefined,
              type: type !== dialog.note.type ? type : undefined,
            }
          : { kind: "create-note", id: createId(), content, type };
      }
      case "link":
        return { kind: "edit-note", id: dialog.note.id, taskId: trimmed(form, "taskId") || null };
      case "convert":
        return { kind: "note-to-task", noteId: dialog.note.id, taskId: createId(), title };
      case "action": {
        const dueOn = trimmed(form, "dueOn") || null;
        if (dialog.action) return {
          kind: "edit-action",
          id: dialog.action.id,
          title: title === dialog.action.title ? undefined : title,
          dueOn: dueOn === dialog.action.dueOn ? undefined : dueOn,
        };
        const [kind, id] = trimmed(form, "parent").split(":");
        const parent = dialog.note
          ? { kind: "note" as const, id: dialog.note.id }
          : dialog.parent ?? { kind: kind as ActionParent["kind"], id };
        return { kind: "create-action", id: createId(), title, dueOn, parent };
      }
      case "confirm":
        return dialog.change;
    }
  }

  let heading: string;
  let fields: React.ReactNode;
  let submitLabel = "保存";

  switch (dialog.kind) {
    case "task":
      heading = dialog.task ? "编辑任务" : "新建任务";
      fields = <>
        <TitleField label="任务名称" initial={dialog.task?.title} placeholder="例如：写完产品方案" />
        {dialog.task && <>
          <label>状态
            <select aria-label="状态" name="status" defaultValue={dialog.task.status}>
              {Object.entries(taskStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <ContextFields task={dialog.task} />
        </>}
      </>;
      break;
    case "focus":
      heading = dialog.target === null ? "暂时休息" : "切换任务";
      submitLabel = dialog.target === null ? "休息一下" : "切换";
      fields = <>
        {dialog.target !== null && (
          dialog.target
            ? <p className={styles.dialogTarget}>{dialog.target.title}</p>
            : <label>切换到
                <select aria-label="切换到" name="taskId" required data-initial-focus>
                  {remainingTasks.length === 0 && <option value="">没有其他可切换的任务</option>}
                  {remainingTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
                </select>
              </label>
        )}
        {dialog.source && <>
          <p>离开「{dialog.source.title}」前，可以留一点上下文。</p>
          <ContextFields task={dialog.source} />
        </>}
      </>;
      break;
    case "note":
      heading = dialog.note ? "编辑记录" : "快速记录";
      fields = <>
        <label>此刻想到什么？
          <textarea name="content" rows={4} maxLength={12000} defaultValue={dialog.note?.content} required data-initial-focus />
        </label>
        <label>类型（可选）
          <select aria-label="记录类型" name="type" defaultValue={dialog.note?.type ?? "OTHER"}>
            {Object.entries(noteTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </>;
      break;
    case "link":
      heading = "关联任务";
      fields = <label>任务
        <select aria-label="任务" name="taskId" defaultValue={dialog.note.taskId ?? ""} data-initial-focus>
          <option value="">独立记录</option>
          {activeTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
          {snapshot.tasks.filter((task) => task.archivedAt && task.id === dialog.note.taskId).map((task) => (
            <option key={task.id} value={task.id} disabled>{task.title}（已归档）</option>
          ))}
        </select>
      </label>;
      break;
    case "convert":
      heading = "转为新任务";
      submitLabel = "创建任务";
      fields = <>
        <TitleField label="任务名称" initial={dialog.note.content.trim().split(/\r?\n/)[0].slice(0, 160)} />
        <p>原始记录会保留，并关联到新任务。</p>
      </>;
      break;
    case "action":
      heading = dialog.action ? "编辑行动" : dialog.note ? "转为行动" : "添加行动";
      fields = <>
        {!dialog.action && !dialog.parent && !dialog.note && <label>所属任务或记录
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
        <TitleField label="下一小步" initial={dialog.action?.title ?? dialog.note?.content.trim().split(/\r?\n/)[0].slice(0, 160)} />
        <label>计划日期（可选）
          <input name="dueOn" type="date" min="0001-01-01" max="9999-12-31" defaultValue={dialog.action?.dueOn ?? undefined} />
        </label>
      </>;
      break;
    case "confirm":
      heading = dialog.title;
      fields = <p>{dialog.description}</p>;
      submitLabel = "确认删除";
      break;
  }

  return (
    <dialog
      ref={element}
      className={styles.dialog}
      aria-labelledby="mind-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!writing.current) close();
      }}
    >
      <header className={styles.dialogHeader}>
        <h2 id="mind-dialog-title">{heading}</h2>
        <button type="button" className={styles.iconButton} aria-label="关闭" onClick={close} disabled={pending}>
          <CloseOutlined aria-hidden="true" />
        </button>
      </header>
      <form onSubmit={submit}>
        <fieldset disabled={pending}>
          <div className={styles.fields}>{fields}</div>
          {error && <p role="alert" className={styles.formError}>{error}</p>}
          <footer className={styles.dialogFooter}>
            {dialog.kind === "focus" && dialog.source && (
              <button type="submit" value="skip">跳过备注</button>
            )}
            <button type="submit" className={dialog.kind === "confirm" ? styles.danger : styles.primary}>
              {pending ? "处理中…" : submitLabel}
            </button>
          </footer>
        </fieldset>
      </form>
    </dialog>
  );
}

function TitleField({ label, initial, placeholder }: { label: string; initial?: string; placeholder?: string }) {
  return <label>{label}
    <input name="title" maxLength={160} defaultValue={initial} placeholder={placeholder} required data-initial-focus />
  </label>;
}

function ContextFields({ task }: { task: MindTaskDto }) {
  return <>
    <label>上次做到哪（可选）
      <textarea name="lastContext" rows={3} maxLength={12000} defaultValue={task.lastContext ?? ""} />
    </label>
    <label>下一步做什么（可选）
      <textarea name="nextAction" rows={2} maxLength={4000} defaultValue={task.nextAction ?? ""} />
    </label>
  </>;
}
