import { useRef, useState } from "react";
import type { FormEvent } from "react";
import type { MindSwitchChange, MindTaskDto, MindTaskStatus } from "@arrivo/contracts";
import { ExpandableTextField } from "@/components/expandable-text-field";
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
      <ExpandableTextField name="lastContext" maxLength={12000} defaultValue={task.lastContext ?? ""} />
    </label>
    <label>下一步做什么（可选）
      <ExpandableTextField name="nextAction" maxLength={4000} defaultValue={task.nextAction ?? ""} />
    </label>
  </>;
}

export function TaskEditor({
  task,
  save,
  cancel,
}: {
  task: MindTaskDto;
  save: (change: MindSwitchChange) => Promise<void>;
  cancel: () => void;
}) {
  const writing = useRef(false);
  const [titleInput, setTitleInput] = useState(task.title);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (writing.current) return;
    const form = new FormData(event.currentTarget);
    const title = titleInput.trim();
    if (!title) {
      setError("请输入任务名称");
      return;
    }

    writing.current = true;
    setPending(true);
    setError(null);
    try {
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
    } catch (reason) {
      setError(mindSwitchError(reason));
    } finally {
      writing.current = false;
      setPending(false);
    }
  }

  return <form className={styles.taskEditor} aria-label="编辑任务" aria-busy={pending} onSubmit={submit}>
    <fieldset disabled={pending}>
      <div className={styles.fields}>
        <label>任务名称
          <ExpandableTextField
            name="title"
            required
            placeholder="输入任务名称"
            value={titleInput}
            onChange={(event) => setTitleInput(event.target.value)}
            autoFocus
          />
        </label>
        <label>状态
          <select aria-label="状态" name="status" defaultValue={task.status}>
            {Object.entries(taskStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <ContextFields task={task} />
      </div>
      {error && <p className={styles.formError} role="alert">{error}</p>}
      <div className={styles.buttons}>
        <button className={styles.primary} type="submit">{pending ? "保存中…" : "保存"}</button>
        <button type="button" onClick={cancel}>取消</button>
      </div>
    </fieldset>
  </form>;
}
