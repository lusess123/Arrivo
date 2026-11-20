import { useCallback, useEffect, useRef, useState } from "react";
import type { ElementRef, FormEvent } from "react";
import { useNavigate } from "@umijs/max";
import { ArrowRightOutlined, ArrowUpOutlined, CheckCircleOutlined } from "@ant-design/icons";
import axios from "axios";
import type { ApiSuccess, AuthUserDto } from "@arrivo/contracts";
import { ExpandableTextField } from "@/components/expandable-text-field";
import { buildLoginUrl, isAuthenticatedUser } from "@/lib/auth-redirect";
import { mindSwitchError, mindSwitchTimeout, submitMindSwitchChange } from "@/lib/mind-switch-api";
import styles from "./home.module.less";

const draftKey = "arrivo-home-task-draft";
const loginReturn = "/?addTask=1";

type Draft = { id: string; title: string };
type SavedTask = Draft & { accountId: string };

function getDraft(): Draft | null {
  try {
    const draft = JSON.parse(window.sessionStorage.getItem(draftKey) ?? "null");
    if (typeof draft?.id === "string" && typeof draft.title === "string") return draft;
  } catch {
    // Task creation still works when tab storage is unavailable.
  }
  return null;
}

function clearDraft() {
  try {
    window.sessionStorage.removeItem(draftKey);
  } catch {
    // No draft could be written if tab storage is unavailable.
  }
}

export function HomeTaskForm({ resume }: { resume: boolean }) {
  const navigate = useNavigate();
  const [initialDraft] = useState(getDraft);
  const [title, setTitle] = useState(() => initialDraft?.title ?? "");
  const [mostRecent, setMostRecent] = useState<SavedTask | null>(null);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const draft = useRef(initialDraft);
  const writing = useRef(false);
  const resumed = useRef(false);
  const input = useRef<ElementRef<typeof ExpandableTextField>>(null);

  const createTask = useCallback(async (task: Draft, afterLogin = false) => {
    if (writing.current) return;
    writing.current = true;
    setPending(true);
    setError(null);
    try {
      const { data } = await axios.get<ApiSuccess<AuthUserDto | null>>("/api/auth", { timeout: mindSwitchTimeout });
      if (!isAuthenticatedUser(data.data)) {
        if (afterLogin) throw new Error("登录后即可保存任务，请重试。");
        try {
          window.sessionStorage.setItem(draftKey, JSON.stringify(task));
        } catch {
          throw new Error("浏览器无法带上这条草稿，请先登录再添加。");
        }
        window.location.assign(buildLoginUrl(loginReturn));
        return;
      }

      await submitMindSwitchChange(data.data.id, { kind: "create-task", ...task });
      clearDraft();
      draft.current = null;
      setMostRecent({ ...task, accountId: data.data.id });
      setTitle("");
    } catch (reason) {
      if (axios.isAxiosError(reason) && reason.response?.status === 401) {
        try {
          window.sessionStorage.setItem(draftKey, JSON.stringify(task));
        } catch {
          // The input remains on the page until the existing login redirect.
        }
      }
      setError(mindSwitchError(reason));
    } finally {
      writing.current = false;
      setPending(false);
    }
  }, []);

  useEffect(() => {
    if (!resume || resumed.current) return;
    resumed.current = true;
    const finish = initialDraft ? createTask(initialDraft, true) : Promise.resolve();
    void finish.finally(() => navigate("/", { replace: true }));
  }, [resume, initialDraft, navigate, createTask]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = title.trim();
    if (!name || writing.current) return;

    if (!editing || !mostRecent) {
      if (draft.current?.title !== name) draft.current = { title: name, id: crypto.randomUUID() };
      await createTask(draft.current);
      return;
    }

    if (name === mostRecent.title) {
      setEditing(false);
      setTitle("");
      return;
    }
    writing.current = true;
    setPending(true);
    setError(null);
    try {
      await submitMindSwitchChange(mostRecent.accountId, { kind: "edit-task", id: mostRecent.id, title: name });
      setMostRecent({ ...mostRecent, title: name });
      setEditing(false);
      setTitle("");
    } catch (reason) {
      setError(mindSwitchError(reason));
    } finally {
      writing.current = false;
      setPending(false);
    }
  }

  return (
    <section className={styles.quickTask} aria-label="快速添加任务">
      <form onSubmit={submit} aria-busy={pending}>
        <label className={editing ? styles.editLabel : styles.srOnly} htmlFor="home-task-name">{editing ? "编辑任务" : "新建任务"}</label>
        <div className={styles.quickInput}>
          <ExpandableTextField
            ref={input}
            id="home-task-name"
            name="task"
            placeholder="输入任务名称"
            value={title}
            aria-describedby="home-task-keys"
            required
            readOnly={pending}
            onChange={(event) => {
              const value = event.target.value;
              if (initialDraft && draft.current === initialDraft && value !== initialDraft.title) {
                clearDraft();
                draft.current = null;
              }
              setTitle(value);
              setError(null);
            }}
          />
        </div>
        <div className={styles.composerFooter}>
          <p id="home-task-keys" className={styles.taskKeys}>
            回车换行<span className={styles.shortcut}> · Ctrl / ⌘ + 回车保存</span>
          </p>
          {editing && <button
            className={styles.taskTextButton}
            type="button"
            disabled={pending}
            onClick={() => {
              setEditing(false);
              setTitle("");
              setError(null);
            }}
          >取消</button>}
          <button className={styles.submit} type="submit" disabled={pending || !title.trim()}>
            {pending ? "保存中…" : editing ? "保存" : "添加任务"}
            <ArrowUpOutlined aria-hidden="true" />
          </button>
        </div>
      </form>
      {error && <p className={styles.taskError} role="alert">{error}</p>}
      {mostRecent && !editing && !title && (
        <div className={styles.taskSaved}>
          <CheckCircleOutlined aria-hidden="true" /><p role="status">已保存「{mostRecent.title}」</p>
          <div className={styles.savedActions}>
            <button type="button" className={styles.taskTextButton} onClick={() => {
              setTitle(mostRecent.title);
              setEditing(true);
              input.current?.focus();
            }}>编辑</button>
            <a className={styles.focusLink} href={`/mind-switch#task=${encodeURIComponent(mostRecent.id)}`}>
              去专注 <ArrowRightOutlined aria-hidden="true" />
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
