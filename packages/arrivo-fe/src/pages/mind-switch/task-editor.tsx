import { useRef, useState } from "react";
import type { FormEvent } from "react";
import type { MindSwitchChange, MindTaskDto, MindTaskStatus } from "@arrivo/contracts";
import { ExpandableTextField } from "@/components/expandable-text-field";
import { useLocale, type MessagePair } from "@/lib/locale";
import { mindSwitchErrorCopy } from "@/lib/mind-switch-api";
import styles from "./index.module.less";

export const taskStatuses: Record<MindTaskStatus, MessagePair> = {
  IN_PROGRESS: ["进行中", "In progress"],
  WAITING: ["等待中", "Waiting"],
  PAUSED: ["暂停", "Paused"],
  DONE: ["完成", "Done"],
};

export function readTaskContext(form: FormData) {
  const lastContext = String(form.get("lastContext") ?? "");
  const nextAction = String(form.get("nextAction") ?? "");
  return {
    lastContext: lastContext.trim() ? lastContext : null,
    nextAction: nextAction.trim() ? nextAction : null,
  };
}

export function ContextFields({ task }: { task: MindTaskDto }) {
  const { t } = useLocale();
  return <>
    <label>{t("上次做到哪（可选）", "Where you left off (optional)")}
      <ExpandableTextField name="lastContext" maxLength={12000} defaultValue={task.lastContext ?? ""} />
    </label>
    <label>{t("下一步做什么（可选）", "Next step (optional)")}
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
  const { t } = useLocale();
  const writing = useRef(false);
  const [titleInput, setTitleInput] = useState(task.title);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<MessagePair | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (writing.current) return;
    const form = new FormData(event.currentTarget);
    const title = titleInput.trim();
    if (!title) {
      setError(["请输入任务名称", "Enter a task name."]);
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
      setError(mindSwitchErrorCopy(reason));
    } finally {
      writing.current = false;
      setPending(false);
    }
  }

  return <form className={styles.taskEditor} aria-label={t("编辑任务", "Edit task")} aria-busy={pending} onSubmit={submit}>
    <fieldset disabled={pending}>
      <div className={styles.fields}>
        <label>{t("任务名称", "Task name")}
          <ExpandableTextField
            name="title"
            required
            placeholder={t("输入任务名称", "Enter a task name")}
            value={titleInput}
            onChange={(event) => setTitleInput(event.target.value)}
            autoFocus
          />
        </label>
        <label>{t("状态", "Status")}
          <select aria-label={t("状态", "Status")} name="status" defaultValue={task.status}>
            {Object.entries(taskStatuses).map(([value, label]) => <option key={value} value={value}>{t(...label)}</option>)}
          </select>
        </label>
        <ContextFields task={task} />
      </div>
      {error && <p className={styles.formError} role="alert">{t(...error)}</p>}
      <div className={styles.buttons}>
        <button className={styles.primary} type="submit">{pending ? t("保存中…", "Saving…") : t("保存", "Save")}</button>
        <button type="button" onClick={cancel}>{t("取消", "Cancel")}</button>
      </div>
    </fieldset>
  </form>;
}
