import { useRef, useState } from "react";
import type { ElementRef, FormEvent } from "react";
import { ArrowUpOutlined } from "@ant-design/icons";
import type { MindSwitchChange } from "@arrivo/contracts";
import { ExpandableTextField } from "@/components/expandable-text-field";
import { mindSwitchError } from "@/lib/mind-switch-api";
import styles from "./workspace-capture.module.less";

type Kind = "task" | "note";
type View = "workspace" | "focus";
type Draft = { text: string; message?: string; error?: string };
const kinds = ["task", "note"] as const;
const labels = { task: "新建任务", note: "随手记" };

export function WorkspaceCapture({ save, focusMode = false }: {
  save: (change: MindSwitchChange) => Promise<void>;
  focusMode?: boolean;
}) {
  const [selection, setSelection] = useState<Record<View, Kind>>({ workspace: "task", focus: "note" });
  const [editingView, setEditingView] = useState<View | null>(null);
  const [drafts, setDrafts] = useState<Record<Kind, Draft>>({ task: { text: "" }, note: { text: "" } });
  const [pending, setPending] = useState(false);
  const writing = useRef(false);
  const attempts = useRef<Partial<Record<Kind, { text: string; id: string }>>>({});
  const field = useRef<ElementRef<typeof ExpandableTextField>>(null);
  const bookmark = useRef<{ view: View; start: number; end: number } | null>(null);
  const layoutView = focusMode ? "focus" : "workspace";
  // Remote focus changes can change the layout while the user is still typing.
  const view = editingView ?? layoutView;
  const kind = selection[view];
  const draft = drafts[kind];
  const isTask = kind === "task";
  const fieldId = isTask ? "mind-task-name" : "mind-note-content";
  const continueTask = !isTask && bookmark.current?.view === view;

  function select(item: Kind) {
    const input = field.current?.resizableTextArea?.textArea;
    if (kind !== item) {
      bookmark.current = isTask && draft.text.trim() && input
        ? { view, start: input.selectionStart, end: input.selectionEnd }
        : null;
      setSelection((previous) => ({ ...previous, [view]: item }));
    }
    field.current?.focus({ preventScroll: true });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (writing.current || !draft.text.trim()) return;
    const text = isTask ? draft.text.trim() : draft.text;
    const form = event.currentTarget;
    const resume = continueTask ? bookmark.current : null;
    writing.current = true;
    setPending(true);
    try {
      let attempt = attempts.current[kind];
      if (attempt?.text !== text) {
        attempt = { text, id: crypto.randomUUID() };
        attempts.current[kind] = attempt;
      }
      await save(isTask
        ? { kind: "create-task", id: attempt.id, title: text }
        : { kind: "create-note", id: attempt.id, content: text });
      delete attempts.current[kind];
      const message = isTask ? "任务已保存" : "已存入暂存箱";
      setDrafts((previous) => {
        const updated = { ...previous, [kind]: { text: "", message } };
        if (resume) updated.task = { ...previous.task, message, error: undefined };
        return updated;
      });
      if (resume) {
        bookmark.current = null;
        // A device switch may have moved this bookmark to the ordinary workspace.
        const returnView = resume.view;
        setSelection((previous) => ({ ...previous, [returnView]: "task" }));
        requestAnimationFrame(() => {
          const input = field.current?.resizableTextArea?.textArea;
          if (input?.id !== "mind-task-name" || form.dataset.view !== returnView || !form.getClientRects().length) return;
          if (document.activeElement !== document.body && !form.contains(document.activeElement)) return;
          input.focus({ preventScroll: true });
          input.setSelectionRange(resume.start, resume.end);
        });
      }
    } catch (reason) {
      setDrafts((previous) => ({ ...previous, [kind]: { text: draft.text, error: mindSwitchError(reason) } }));
    } finally {
      writing.current = false;
      setPending(false);
    }
  }

  return <form
    className={styles.capture}
    data-kind={kind}
    data-view={view}
    aria-label={labels[kind]}
    aria-busy={pending}
    onFocus={() => setEditingView(view)}
    onBlur={(event) => {
      if (event.currentTarget.contains(event.relatedTarget)) return;
      if (view !== layoutView) {
        setSelection((previous) => ({ ...previous, [layoutView]: kind }));
        if (bookmark.current?.view === view) bookmark.current.view = layoutView;
      }
      setEditingView(null);
    }}
    onSubmit={submit}
  >
    <div className={styles.selector} role="group" aria-label="记录方式">
      {kinds.map((item) => <button
        key={item}
        type="button"
        data-kind={item}
        aria-pressed={kind === item}
        disabled={pending}
        onClick={() => select(item)}
      >
        <span className={styles.glyph} aria-hidden="true" />
        {labels[item]}
        {kind !== item && drafts[item].text && <small>草稿</small>}
      </button>)}
    </div>
    <ExpandableTextField
      ref={field}
      id={fieldId}
      name={isTask ? "title" : "content"}
      aria-label={labels[kind]}
      aria-describedby="mind-capture-help"
      aria-keyshortcuts="Control+Enter Meta+Enter"
      maxLength={isTask ? 160 : 12000}
      placeholder={isTask ? "输入任务名称" : "刚才想到了什么？"}
      value={draft.text}
      readOnly={pending}
      required
      onChange={(event) => {
        const text = event.target.value;
        setDrafts((previous) => ({ ...previous, [kind]: { text } }));
      }}
    />
    <div className={styles.footer}>
      <p id="mind-capture-help">
        {draft.error ? <span role="alert" className={styles.error}>{draft.error}</span>
          : <span role="status">{draft.message || <>回车换行<span className={styles.keys}> · {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"} + Enter 保存</span></>}</span>}
      </p>
      <button className={styles.submit} type="submit" disabled={pending || !draft.text.trim()}>
        {pending ? "保存中…" : isTask ? "添加任务" : continueTask ? "保存并继续任务" : "存入暂存箱"} <ArrowUpOutlined aria-hidden="true" />
      </button>
    </div>
  </form>;
}
