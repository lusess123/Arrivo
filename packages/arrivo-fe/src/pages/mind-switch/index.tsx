import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AimOutlined,
  CalendarOutlined,
  DownOutlined,
  EditOutlined,
  CompressOutlined,
  ExpandOutlined,
  ArrowRightOutlined,
  BulbOutlined,
  CheckSquareOutlined,
  SwapOutlined,
  PlusOutlined,
  SettingOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import type { MindActionDto, MindNoteDto, MindSwitchChange, MindTaskDto } from "@arrivo/contracts";
import { LanguageSwitch } from "@/components/language-switch";
import { useLocale, type MessagePair } from "@/lib/locale";
import { mindSwitchErrorCopy } from "@/lib/mind-switch-api";
import { WorkspaceEditor, noteTypes } from "./workspace-editor";
import type { ActionParent, WorkspaceEdit } from "./workspace-editor";
import { TaskEditor, taskStatuses } from "./task-editor";
import { WorkspaceCapture } from "./workspace-capture";
import { useMindSwitch } from "./use-mind-switch";
import styles from "./index.module.less";

const sections = [
  { id: "focus", label: ["当前焦点", "Current focus"], icon: AimOutlined },
  { id: "tasks", label: ["任务", "Tasks"], icon: UnorderedListOutlined },
  { id: "notes", label: ["暂存箱", "Inbox"], icon: BulbOutlined },
  { id: "plan", label: ["行动计划", "Action plan"], icon: CheckSquareOutlined },
  { id: "settings", label: ["设置", "Settings"], icon: SettingOutlined },
] as const;

type Section = (typeof sections)[number]["id"];

const emptyActions: MindActionDto[] = [];

export default function MindSwitchPage() {
  const { t, locale } = useLocale();
  const label = (copy: MessagePair) => t(...copy);
  const dueDate = useMemo(() => new Intl.DateTimeFormat(locale, {
    year: "numeric", month: "short", day: "numeric", timeZone: "UTC",
  }), [locale]);
  const { snapshot, sync, lastSynced, refresh, change, exportWorkspace } = useMindSwitch();
  const [section, setSection] = useState<Section>("focus");
  const [editor, setEditor] = useState<{ edit: WorkspaceEdit; version: number; returnFocus: HTMLElement | null } | null>(null);
  const [editingTask, setEditingTask] = useState<MindTaskDto | null>(null);
  const [notice, setNotice] = useState<{ text: MessagePair; error?: boolean } | null>(null);
  const [pending, setPending] = useState(false);
  const acting = useRef(false);
  const [readingTaskId, setReadingTaskId] = useState<string | null>(null);
  const enterButton = useRef<HTMLButtonElement>(null);
  const exitButton = useRef<HTMLButtonElement>(null);
  const focusTitle = useRef<HTMLHeadingElement>(null);

  const tasks = snapshot?.tasks;
  const notes = snapshot?.notes;
  const actions = snapshot?.actions;
  const taskById = useMemo(() => new Map(tasks?.map((task) => [task.id, task])), [tasks]);
  const noteById = useMemo(() => new Map(notes?.map((note) => [note.id, note])), [notes]);
  const actionsByParent = useMemo(() => {
    const map = new Map<string, MindActionDto[]>();
    for (const action of actions ?? []) {
      const key = action.taskId ? `task:${action.taskId}` : `note:${action.noteId}`;
      const group = map.get(key);
      if (group) group.push(action);
      else map.set(key, [action]);
    }
    return map;
  }, [actions]);

  const current = snapshot?.currentTaskId ? taskById.get(snapshot.currentTaskId) : undefined;
  const contextTask = editingTask ?? current;
  const activeTasks = tasks?.filter((task) => !task.archivedAt) ?? [];
  const archivedTasks = tasks?.filter((task) => task.archivedAt) ?? [];
  const otherTasks = activeTasks.filter((task) => task.id !== current?.id);
  const waitingTasks = otherTasks.filter((task) => task.status === "WAITING");
  const inboxNotes = notes?.filter((note) => !note.setAside) ?? [];
  const setAsideNotes = notes?.filter((note) => note.setAside) ?? [];
  const canSwitch = otherTasks.length > 0;
  const focusMode = readingTaskId !== null && readingTaskId === current?.id && section === "focus";

  function exitFocusMode() {
    exitButton.current?.focus({ preventScroll: true });
    setReadingTaskId(null);
    requestAnimationFrame(() => (enterButton.current ?? focusTitle.current)?.focus());
  }

  useEffect(() => {
    if (!focusMode) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || event.isComposing || event.keyCode === 229) return;
      if (event.target instanceof HTMLSelectElement) return;
      event.preventDefault();
      exitFocusMode();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [focusMode]);

  useEffect(() => {
    if (readingTaskId && readingTaskId !== current?.id) {
      setReadingTaskId(null);
      setNotice({ text: ["当前焦点已更新，已回到工作台。", "Your focus changed on another device. You’re back in the workspace."] });
      if (document.activeElement === document.body) focusTitle.current?.focus();
    }
  }, [readingTaskId, current?.id]);

  useEffect(() => {
    if (!snapshot || !window.location.hash.startsWith("#task=")) return;
    const taskId = window.location.hash.slice("#task=".length);
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    const target = taskById.get(taskId);
    if (!target || target.archivedAt) {
      setNotice({ text: ["这项任务已归档或不可用。", "This task is archived or unavailable."] });
    } else if (target.id !== current?.id) {
      setEditor({ edit: { kind: "focus", source: current, target }, version: 1, returnFocus: null });
    }
  }, [snapshot, taskById, current]);

  function moveTo(view: Section) {
    setSection(view);
    setReadingTaskId(null);
    setEditingTask(null);
    setEditor(null);
    setNotice(null);
  }

  function startTaskForm(task: MindTaskDto) {
    if (acting.current) return;
    setEditingTask(task);
    setNotice(null);
  }

  async function saveTask(input: MindSwitchChange) {
    const submittedTask = editingTask;
    await change(input);
    if (input.kind === "edit-task") {
      setEditingTask((currentTask) => currentTask === submittedTask ? null : currentTask);
    }
    setNotice({ text: ["任务已保存", "Task saved"] });
  }

  function open(edit: WorkspaceEdit) {
    if (acting.current) return;
    setNotice(null);
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setEditor((currentEditor) => ({ edit, version: (currentEditor?.version ?? 0) + 1, returnFocus }));
  }

  async function perform(operation: () => Promise<void>, success?: MessagePair) {
    if (acting.current) return;
    acting.current = true;
    setPending(true);
    setNotice(null);
    try {
      await operation();
      if (success) setNotice({ text: success });
    } catch (error) {
      setNotice({ text: mindSwitchErrorCopy(error), error: true });
    } finally {
      acting.current = false;
      setPending(false);
    }
  }

  const run = (input: MindSwitchChange) => perform(() => change(input));

  async function save(input: MindSwitchChange) {
    await change(input);
    if (input.kind === "focus") moveTo("focus");
    if (input.kind === "create-note") setNotice({ text: ["已存入暂存箱", "Saved to inbox"] });
    if (input.kind === "note-to-task") setNotice({ text: ["已创建任务，原记录已保留", "Task created. Your original note was kept."] });
    if (input.kind === "clear-workspace") setNotice({ text: ["已清除心智切换数据", "MindSwitch data cleared"] });
  }

  function changeFocus(target?: MindTaskDto | null) {
    if (!current && target) {
      void perform(() => save({ kind: "focus", taskId: target.id, fromTaskId: null }));
      return;
    }
    open({ kind: "focus", source: current, target });
  }

  function confirmDelete(title: MessagePair, description: MessagePair, change: MindSwitchChange) {
    open({ kind: "confirm", title, description, change });
  }

  function actionRows(items: MindActionDto[], listParents = false) {
    if (!items.length) return null;
    return (
      <ul className={styles.actionList}>
        {items.map((action) => {
          const parentLabel = action.taskId
            ? taskById.get(action.taskId)?.title
            : action.noteId && noteById.get(action.noteId)?.content;
          return <li key={action.id} className={styles.actionRow}>
            <label className={action.done ? styles.completed : undefined}>
              <input
                type="checkbox"
                checked={action.done}
                disabled={pending}
                onChange={(event) => void run({ kind: "edit-action", id: action.id, done: event.target.checked })}
              />
              <span>
                <span className={styles.actionTitle}>{action.title}</span>
                {action.dueOn && <time dateTime={action.dueOn}>{dueDate.format(new Date(action.dueOn))}</time>}
                {listParents && parentLabel && <small>{parentLabel}</small>}
              </span>
            </label>
            <div className={styles.rowButtons}>
              <button aria-label={`${t("编辑行动", "Edit action")} ${action.title}`} onClick={() => open({ kind: "action", action })}>{t("编辑", "Edit")}</button>
              <button aria-label={`${t("删除行动", "Delete action")} ${action.title}`} onClick={() =>
                confirmDelete(["删除行动", "Delete action"], [`确定删除「${action.title}」？`, `Delete “${action.title}”?`], { kind: "delete-action", id: action.id })
              }>{t("删除", "Delete")}</button>
            </div>
          </li>;
        })}
      </ul>
    );
  }

  function actionsFor(parent: ActionParent, canAdd = true) {
    const items = actionsByParent.get(`${parent.kind}:${parent.id}`) ?? emptyActions;
    if (!items.length && !canAdd) return null;
    return <div className={styles.steps}>
      {actionRows(items)}
      {canAdd && <button className={styles.textButton} onClick={() => open({ kind: "action", parent })}>
        <PlusOutlined aria-hidden="true" /> {t("添加行动", "Add action")}
      </button>}
    </div>;
  }

  function taskCard(task: MindTaskDto) {
    if (editingTask?.id === task.id) {
      return <article className={styles.item} key={task.id}>
        <TaskEditor task={editingTask} save={saveTask} cancel={() => setEditingTask(null)} />
      </article>;
    }
    const isCurrent = current?.id === task.id;
    const switchLabel = current ? t("切换到此任务", "Switch to this task") : t("开始专注", "Start focusing");
    return <article className={styles.item} key={task.id}>
      <div className={styles.itemHeading}>
        <h2>{task.title}</h2>
        <Status status={task.status} />
        {isCurrent && <span className={styles.currentBadge}><AimOutlined aria-hidden="true" /> {t("当前焦点", "Current focus")}</span>}
      </div>
      {task.nextAction && <p className={styles.itemSnippet}>{t("下一步 · ", "Next step · ")}{task.nextAction}</p>}
      <div className={styles.rowButtons}>
        {!task.archivedAt && !isCurrent && <button
          className={styles.textButton}
          disabled={pending}
          onClick={() => changeFocus(task)}
          aria-label={`${switchLabel} · ${task.title}`}
        >{switchLabel} <ArrowRightOutlined aria-hidden="true" /></button>}
        <button aria-label={`${t("编辑任务", "Edit task")} ${task.title}`} onClick={() => startTaskForm(task)}>{t("编辑", "Edit")}</button>
      </div>
      <details className={styles.more}>
        <summary>{t("更多操作", "More options")} <DownOutlined aria-hidden="true" /></summary>
        <div className={styles.rowButtons}>
          <button
            disabled={pending}
            onClick={() => void run({ kind: "archive-task", id: task.id, archived: !task.archivedAt })}
          >{task.archivedAt ? t("恢复", "Restore") : t("归档", "Archive")}</button>
          <button className={styles.dangerText} onClick={() => confirmDelete(["删除任务", "Delete task"], ["任务及其行动会被删除，关联的独立记录会保留。", "This deletes the task and its actions. Linked notes will be kept."], {
            kind: "delete-task", id: task.id,
          })}>{t("删除", "Delete")}</button>
        </div>
      </details>
      {actionsFor({ kind: "task", id: task.id }, !task.archivedAt)}
    </article>;
  }

  function noteCard(note: MindNoteDto) {
    const relatedTask = note.taskId ? taskById.get(note.taskId) : undefined;
    return <article className={styles.item} key={note.id}>
      <div className={styles.itemHeading}>
        <span className={styles.noteType}>{label(noteTypes[note.type])}</span>
        <time dateTime={note.createdAt}>{new Date(note.createdAt).toLocaleDateString(locale)}</time>
        {relatedTask && <span className={styles.related}>{relatedTask.title}</span>}
      </div>
      <p className={styles.noteBody}>{note.content}</p>
      <div className={styles.rowButtons}>
        <button onClick={() => open({ kind: "note", note })}>{t("编辑", "Edit")}</button>
        <button
          disabled={pending}
          onClick={() => void run({ kind: "edit-note", id: note.id, setAside: !note.setAside })}
        >{note.setAside ? t("恢复到暂存箱", "Return to inbox") : t("暂时放下", "Set aside")}</button>
      </div>
      <details className={styles.more}>
        <summary>{t("更多操作", "More options")} <DownOutlined aria-hidden="true" /></summary>
        <div className={styles.rowButtons}>
          <button onClick={() => open({ kind: "link", note })}>{t("关联任务", "Link to task")}</button>
          <button onClick={() => open({ kind: "convert", note })}>{t("转为任务", "Turn into a task")}</button>
          <button onClick={() => open({ kind: "action", note })}>{t("转为行动", "Turn into an action")}</button>
          <button className={styles.dangerText} onClick={() => confirmDelete(["删除记录", "Delete note"], ["这条记录及其行动会被永久删除。", "This permanently deletes the note and its actions."], {
            kind: "delete-note", id: note.id,
          })}>{t("删除", "Delete")}</button>
        </div>
      </details>
      {actionsFor({ kind: "note", id: note.id }, false)}
    </article>;
  }

  const syncLabel = sync === "ready" ? t("已同步", "Synced") : sync === "failed" ? t("同步异常", "Sync issue") : t("正在同步", "Syncing");
  const currentSection = sections.find(({ id }) => id === section)!;

  const today = new Date();
  const currentActions = current ? actionsByParent.get(`task:${current.id}`) ?? emptyActions : emptyActions;
  const switchList = current && waitingTasks.length ? waitingTasks : otherTasks;
  const counts = {
    focus: undefined, tasks: activeTasks.length, notes: inboxNotes.length,
    plan: actions?.filter((action) => !action.done).length, settings: undefined,
  };

  return <div className={styles.shell} lang={locale} data-focus-mode={focusMode}>
    <header className={styles.topBar}>
      <div className={styles.brand}>
        <a href="/" aria-label={t("返回 Arrivo 首页", "Back to Arrivo home")}><img src="/favicon.svg" alt="" width="30" height="30" /><span className={styles.brandText}>Arrivo</span></a>
        <span className={styles.divider} aria-hidden="true" />
        <span className={styles.productName}>{t("心智切换", "MindSwitch")}</span>
      </div>
      <nav className={styles.sections} aria-label={t("心智切换功能", "MindSwitch navigation")} hidden={focusMode}>
        {sections.map(({ id, label: sectionLabel, icon: Icon }) => <button
          key={id}
          aria-label={label(sectionLabel)}
          aria-current={section === id ? "page" : undefined}
          onClick={() => {
            moveTo(id);
            window.scrollTo(0, 0);
          }}
        ><Icon aria-hidden="true" /><span>{label(sectionLabel)}</span>
          {snapshot && Boolean(counts[id]) && <small aria-hidden="true">{counts[id]}</small>}
        </button>)}
      </nav>
      <div className={styles.topActions}>
        <LanguageSwitch />
        {focusMode
          ? <button ref={exitButton} className={styles.exitButton} onClick={exitFocusMode}>
              <CompressOutlined aria-hidden="true" /> {t("退出专注视图", "Exit focus view")}
            </button>
          : <button className={styles.syncButton} onClick={() => moveTo("settings")} data-sync={sync} aria-label={syncLabel} title={syncLabel}>
              <span className={styles.syncIndicator} aria-hidden="true" /><span className={styles.syncLabel}>{syncLabel}</span>
            </button>}
        <button className={styles.recordButton} onClick={() => open({ kind: "note" })} disabled={!snapshot} aria-label={t("快速记录", "Quick note")}>
          <PlusOutlined aria-hidden="true" /><span>{t("快速记录", "Quick note")}</span>
        </button>
      </div>
    </header>
    <div className={styles.layout}>
      <main className={styles.main} aria-busy={sync === "loading"}>
        {sync === "failed" && <div className={styles.syncError} role="status">
          <span>{t("无法同步，正在编辑的内容仍保留在页面。", "Couldn’t sync. Your edits are still on this page.")}</span>
          <button onClick={() => void refresh(true)}>{t("重新同步", "Sync again")}</button>
        </div>}
        {!snapshot && sync === "loading" && <p className={styles.empty} role="status">{t("正在载入工作区…", "Loading your workspace…")}</p>}
        {!snapshot && sync === "failed" && <p className={styles.empty}>{t("联网后即可打开工作区。", "Connect to the internet to open your workspace.")}</p>}
        {notice && <p className={notice.error ? styles.errorNotice : styles.notice} role={notice.error ? "alert" : "status"}>{label(notice.text)}</p>}

        {snapshot && <div className={section === "focus" ? styles.srOnly : styles.pageHeading}>
          <h1>{section === "focus" ? t("专注工作台", "Focus workspace") : label(currentSection.label)}</h1>
          {section === "plan" && <button
            className={styles.primary}
            onClick={() => open({ kind: "action" })}
            disabled={!activeTasks.length && !notes?.length}
          ><PlusOutlined aria-hidden="true" /> {t("添加行动", "Add action")}</button>}
        </div>}
        {snapshot && editor && <WorkspaceEditor
          key={editor.version}
          edit={editor.edit}
          returnFocus={editor.returnFocus}
          snapshot={snapshot}
          close={() => setEditor((currentEditor) => currentEditor === editor ? null : currentEditor)}
          save={save}
        />}
        {snapshot && <div
          hidden={section !== "focus" && section !== "tasks"}
          className={section === "focus" ? styles.focusGrid : styles.taskView}
        >
          {section === "focus" && <section className={styles.focusPanel} aria-label={t("当前焦点", "Current focus")}>
            <div className={styles.focusCard}>
              <div className={styles.focusMeta}>
                <span className={styles.focusMark}>{t("当前焦点", "Current focus")}</span>
                {current && <Status status={current.status} />}
                <time className={styles.date} dateTime={today.toLocaleDateString("sv-SE")}>
                  <CalendarOutlined aria-hidden="true" />{today.toLocaleDateString(locale, { month: "long", day: "numeric", weekday: "long" })}
                </time>
              </div>
              <h2 ref={focusTitle} tabIndex={-1}>{current?.title ?? t("从一件事开始", "Start with one task")}</h2>
              {!current && <p className={styles.emptyFocus}>
                {canSwitch ? t("选一件现在想做的事，接着上次的进度。", "Choose a task and pick up where you left off.") : t("在「新建任务」写下第一件想做的事。", "Add your first task to get started.")}
              </p>}
              {!focusMode && (canSwitch || current) && <div className={styles.buttons}>
                {current && <button ref={enterButton} className={styles.primary} onClick={() => {
                  enterButton.current?.focus({ preventScroll: true });
                  setReadingTaskId(current.id);
                  requestAnimationFrame(() => exitButton.current?.focus());
                }}><ExpandOutlined aria-hidden="true" /> {t("进入专注视图", "Enter focus view")}</button>}
                {canSwitch && <button className={current ? styles.textButton : styles.primary} disabled={pending} onClick={() => changeFocus(!current && otherTasks.length === 1 ? otherTasks[0] : undefined)}>
                  {current ? t("切换任务", "Switch task") : t("开始专注", "Start focusing")} <ArrowRightOutlined aria-hidden="true" />
                </button>}
                {current && <button className={styles.textButton} onClick={() => changeFocus(null)}>{t("暂时休息", "Take a break")}</button>}
              </div>}
            </div>
            {contextTask && <div className={styles.context}>
              <div className={styles.sideHeading}>
                <h2>{editingTask ? t("编辑任务", "Edit task") : t("继续上次的进度", "Pick up where you left off")}</h2>
                {!editingTask && <button className={styles.textButton} onClick={() => startTaskForm(contextTask)}>
                  <EditOutlined aria-hidden="true" /> {t("编辑上下文", "Edit context")}
                </button>}
              </div>
              {editingTask
                ? <TaskEditor task={editingTask} save={saveTask} cancel={() => setEditingTask(null)} />
                : <div className={styles.contextGrid} key={contextTask.id}>
                    <ContextValue label={t("下一步做什么", "Next step")} value={contextTask.nextAction || t("尚无下一步", "No next step yet")} />
                    <ContextValue label={t("上次做到哪", "Where you left off")} value={contextTask.lastContext || t("尚无备注", "No context yet")} />
                  </div>}
            </div>}
          </section>}
          <div className={styles.capture}>
            <WorkspaceCapture save={change} focusMode={focusMode} />
            {section === "focus" && !focusMode && switchList.length > 0 && <section className={styles.waiting}>
              <div className={styles.sideHeading}>
                <h2><SwapOutlined aria-hidden="true" /> {current && waitingTasks.length ? t("后台等待", "Waiting tasks") : t("待切换任务", "Other tasks")}</h2>
                <span className={styles.count}>{switchList.length}</span>
              </div>
              <ul className={styles.miniList}>
                {switchList.slice(0, 4).map((task) => <li key={task.id}>
                  <button disabled={pending} onClick={() => changeFocus(task)}>
                    <span>{task.title}</span><ArrowRightOutlined aria-hidden="true" />
                  </button>
                </li>)}
              </ul>
              {switchList.length > 4 && <button className={styles.textButton} onClick={() => moveTo("tasks")}>{t("查看全部任务", "View all tasks")} <ArrowRightOutlined aria-hidden="true" /></button>}
            </section>}
          </div>
          {section === "focus" && current && <section className={styles.actionPanel}>
            <div className={styles.sideHeading}>
              <h2><CheckSquareOutlined aria-hidden="true" /> {t("行动计划", "Action plan")}</h2>
              {currentActions.length > 0 && <span className={styles.count}>
                {currentActions.filter((action) => action.done).length} / {currentActions.length} {t("已完成", "complete")}
              </span>}
            </div>
            {actionsFor({ kind: "task", id: current.id })}
          </section>}

          {section === "tasks" && <>
            <div className={styles.list}>{activeTasks.length ? activeTasks.map(taskCard) : <p className={styles.empty}>{t("你的任务会出现在这里。", "Your tasks will appear here.")}</p>}</div>
            {archivedTasks.length > 0 && <details className={styles.fold}>
              <summary>{t("已归档", "Archived")} <span>{archivedTasks.length}</span></summary>
              <div className={styles.list}>{archivedTasks.map(taskCard)}</div>
            </details>}
          </>}
        </div>}

        {snapshot && section === "notes" && <>
          <div className={styles.list}>{inboxNotes.length ? inboxNotes.map(noteCard) : <p className={styles.empty}>{t("有想法、担忧或灵感，随时记下来。", "Keep ideas, concerns and inspiration here.")}</p>}</div>
          {setAsideNotes.length > 0 && <details className={styles.fold}>
            <summary>{t("已放下", "Set aside")} <span>{setAsideNotes.length}</span></summary>
            <div className={styles.list}>{setAsideNotes.map(noteCard)}</div>
          </details>}
        </>}

        {snapshot && section === "plan" && (
          actions?.length
            ? actionRows(actions, true)
            : <p className={styles.empty}>
                {activeTasks.length || notes?.length ? t("给任务或一条记录添加下一小步。", "Add a next step to a task or note.") : t("创建任务或记录后，就能为它添加行动。", "Create a task or note to add your first action.")}
              </p>
        )}

        {snapshot && section === "settings" && <div className={styles.list}>
          <section className={styles.item}>
            <h2>{t("账号与同步", "Account and sync")}</h2>
            <p>{t("同一个 Arrivo 账号可在手机和电脑上使用。", "Your Arrivo account works across devices.")}{lastSynced && t(
              `上次同步于 ${lastSynced.toLocaleTimeString(locale)}。`, ` Last synced at ${lastSynced.toLocaleTimeString(locale)}.`,
            )}</p>
            <button onClick={() => void refresh(true)}>{t("重新同步", "Sync again")}</button>
          </section>
          <section className={styles.item}>
            <h2>{t("隐私与数据", "Privacy and data")}</h2>
            <p>{t("任务、记录和行动只对当前账号可见。你可以导出数据，也可以清除这个功能的数据。", "Only you can see your tasks, notes and actions. You can export or clear your MindSwitch data.")}</p>
            <div className={styles.buttons}>
              <button disabled={pending} onClick={() => void perform(exportWorkspace, ["已请求下载数据", "Export download requested"])}>{t("导出 JSON", "Export JSON")}</button>
              <button className={styles.dangerText} onClick={() => confirmDelete(
                ["清除心智切换数据", "Clear MindSwitch data"],
                ["当前账号的所有任务、记录和行动会被永久删除。语言复读数据不受影响。", "This permanently deletes all tasks, notes and actions in this account. Your language practice data will be kept."],
                { kind: "clear-workspace" },
              )}>{t("清除数据", "Clear data")}</button>
            </div>
          </section>
        </div>}
      </main>

    </div>
  </div>;
}

function ContextValue({ label, value }: { label: string; value: string }) {
  const { t } = useLocale();
  const text = useRef<HTMLParagraphElement>(null);
  const id = useId();
  const [long, setLong] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useLayoutEffect(() => {
    const element = text.current;
    if (!element) return;
    const measure = () => {
      const lineHeight = parseFloat(getComputedStyle(element).lineHeight);
      setLong(element.scrollHeight > 3 * lineHeight + 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [value]);

  const toggleLabel = expanded ? t("收起", "Show less") : t("展开全文", "Show more");
  return <div>
    <h3>{label}</h3>
    <p ref={text} id={id} className={expanded ? undefined : styles.contextPreview}>{value}</p>
    {long && <button
      className={styles.expandContext}
      aria-controls={id}
      aria-expanded={expanded}
      aria-label={`${toggleLabel} · ${label}`}
      onClick={() => setExpanded(!expanded)}
    >{toggleLabel} <DownOutlined aria-hidden="true" /></button>}
  </div>;
}

function Status({ status }: { status: MindTaskDto["status"] }) {
  const { t } = useLocale();
  return <span className={styles.status} data-status={status}>{t(...taskStatuses[status])}</span>;
}
