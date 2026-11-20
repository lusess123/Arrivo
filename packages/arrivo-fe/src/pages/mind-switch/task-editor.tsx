import { useRef, useState } from "react";
import type { FormEvent } from "react";
import type { MindSwitchChange, MindTaskDto, MindTaskStatus } from "@arrivo/contracts";
import { mindSwitchError } from "@/lib/mind-switch-api";
import styles from "./index.module.less";

export const taskStatuses = {
  IN_PROGRESS: "进行中",
  WAITING: "等待中",
  PAUSED: "暂停",
  DONE: "完成",
} satisfies Record<MindTaskStatus, string>;

export function readTaskContext(form: FormData) {
  const lastContext = String(form.get("lastContext") ?? "");
  const nextAction = String(form.get("nextAction") ?? "");
  return {
    lastContext: lastContext.trim() ? lastContext : null,
    nextAction: nextAction.trim() ? nextAction : null,
  };
}

export function ContextFields({ task }: { task: MindTaskDto }) {
  return <>
    <label>上次做到哪（可选）
      <textarea name="lastContext" rows={3} maxLength={12000} defaultValue={task.lastContext ?? ""} />
    </label>
    <label>下一步做什么（可选）
      <textarea name="nextAction" rows={2} maxLength={4000} defaultValue={task.nextAction ?? ""} />
    </label>
  </>;
}

export function TaskEditor({
  task,
  save,
  cancel,
}: {
  task?: MindTaskDto;
  save: (change: MindSwitchChange) => Promise<void>;
  cancel: () => void;
}) {
  const writing = useRef(false);
  const newTask = useRef<{ id: string; title: string }>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (writing.current) return;
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    if (!title) {
      setError("请输入任务名称");
      return;
    }

    writing.current = true;
    setPending(true);
    setError(null);
    try {
      if (task) {
        const status = form.get("status") as MindTaskStatus;
        const { lastContext, nextAction } = readTaskContext(form);
        await save({
          kind: "edit-task",
          id: task.id,
          title: title === task.title ? undefined : title,
          status: status === task.status ? undefined : status,
          lastContext: lastContext === task.lastContext ? undefined : lastContext,
          nextAction: nextAction === task.nextAction ? undefined : nextAction,
        });
      } else {
        if (newTask.current?.title !== title) newTask.current = { id: crypto.randomUUID(), title };
        await save({ kind: "create-task", ...newTask.current });
      }
    } catch (reason) {
      setError(mindSwitchError(reason));
    } finally {
      writing.current = false;
      setPending(false);
    }
  }

  return <form className={styles.taskEditor} aria-label={task ? "编辑任务" : "新建任务"} aria-busy={pending} onSubmit={submit}>
    <fieldset disabled={pending}>
      <div className={styles.fields}>
        <label>任务名称
          <input name="title" required maxLength={160} placeholder="输入任务名称" defaultValue={task?.title} autoFocus />
        </label>
        {task && <>
          <label>状态
            <select aria-label="状态" name="status" defaultValue={task.status}>
              {Object.entries(taskStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <ContextFields task={task} />
        </>}
      </div>
      {error && <p className={styles.formError} role="alert">{error}</p>}
      <div className={styles.buttons}>
        <button className={styles.primary} type="submit">{pending ? "保存中…" : task ? "保存" : "添加任务"}</button>
        <button type="button" onClick={cancel}>取消</button>
      </div>
    </fieldset>
  </form>;
}
