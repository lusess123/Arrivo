import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AimOutlined,
  CalendarOutlined,
  DownOutlined,
  EditOutlined,
  ReadOutlined,
  ArrowRightOutlined,
  BulbOutlined,
  CheckSquareOutlined,
  SwapOutlined,
  PlusOutlined,
  SettingOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import type { MindActionDto, MindNoteDto, MindSwitchChange, MindTaskDto } from "@arrivo/contracts";
import { mindSwitchError } from "@/lib/mind-switch-api";
import { WorkspaceEditor, noteTypes } from "./workspace-editor";
import type { ActionParent, WorkspaceEdit } from "./workspace-editor";
import { TaskEditor, taskStatuses } from "./task-editor";
import { useMindSwitch } from "./use-mind-switch";
import styles from "./index.module.less";

const sections = [
  { id: "focus", label: "当前焦点", icon: AimOutlined },
  { id: "tasks", label: "任务", icon: UnorderedListOutlined },
  { id: "notes", label: "暂存箱", icon: BulbOutlined },
  { id: "plan", label: "行动计划", icon: CheckSquareOutlined },
  { id: "settings", label: "设置", icon: SettingOutlined },
] as const;

type Section = (typeof sections)[number]["id"];

const emptyActions: MindActionDto[] = [];

export default function MindSwitchPage() {
  const { snapshot, sync, lastSynced, refresh, change, exportWorkspace } = useMindSwitch();
  const [section, setSection] = useState<Section>("focus");
  const [editor, setEditor] = useState<{ edit: WorkspaceEdit; version: number; returnFocus: HTMLElement | null } | null>(null);
  const [editingTask, setEditingTask] = useState<MindTaskDto | null>(null);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, setPending] = useState(false);
  const acting = useRef(false);

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

  useEffect(() => {
    if (!snapshot || !window.location.hash.startsWith("#task=")) return;
    const taskId = window.location.hash.slice("#task=".length);
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    const target = taskById.get(taskId);
    if (!target || target.archivedAt) {
      setNotice({ text: "这项任务已归档或不可用。" });
    } else if (target.id !== current?.id) {
      setEditor({ edit: { kind: "focus", source: current, target }, version: 1, returnFocus: null });
    }
  }, [snapshot, taskById, current]);

  function moveTo(view: Section) {
    setSection(view);
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
    setNotice({ text: "任务已保存" });
  }

  function open(edit: WorkspaceEdit) {
    if (acting.current) return;
    setNotice(null);
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setEditor((currentEditor) => ({ edit, version: (currentEditor?.version ?? 0) + 1, returnFocus }));
  }

  async function perform(operation: () => Promise<void>, success?: string) {
    if (acting.current) return;
    acting.current = true;
    setPending(true);
    setNotice(null);
    try {
      await operation();
      if (success) setNotice({ text: success });
    } catch (error) {
      setNotice({ text: mindSwitchError(error), error: true });
    } finally {
      acting.current = false;
      setPending(false);
    }
  }

  const run = (input: MindSwitchChange, success?: string) => perform(() => change(input), success);

  async function save(input: MindSwitchChange) {
    await change(input);
    if (input.kind === "focus") moveTo("focus");
    if (input.kind === "create-note") setNotice({ text: "已存入暂存箱" });
    if (input.kind === "note-to-task") setNotice({ text: "已创建任务，原记录已保留" });
    if (input.kind === "clear-workspace") setNotice({ text: "已清除心智切换数据" });
  }

  function changeFocus(target?: MindTaskDto | null) {
    if (!current && target) {
      void perform(() => save({ kind: "focus", taskId: target.id, fromTaskId: null }));
      return;
    }
    open({ kind: "focus", source: current, target });
  }

  function confirmDelete(title: string, description: string, change: MindSwitchChange) {
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
                {action.dueOn && <time dateTime={action.dueOn}>{action.dueOn}</time>}
                {listParents && parentLabel && <small>{parentLabel}</small>}
              </span>
            </label>
            <div className={styles.rowButtons}>
              <button aria-label={`编辑行动 ${action.title}`} onClick={() => open({ kind: "action", action })}>编辑</button>
              <button aria-label={`删除行动 ${action.title}`} onClick={() =>
                confirmDelete("删除行动", `确定删除「${action.title}」？`, { kind: "delete-action", id: action.id })
              }>删除</button>
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
        <PlusOutlined aria-hidden="true" /> 添加行动
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
    return <article className={styles.item} key={task.id}>
      <div className={styles.itemHeading}>
        <h2>{task.title}</h2>
        <Status status={task.status} />
        {isCurrent && <span className={styles.currentBadge}><AimOutlined aria-hidden="true" /> 当前焦点</span>}
      </div>
      {task.nextAction && <p className={styles.itemSnippet}>下一步 · {task.nextAction}</p>}
      <div className={styles.rowButtons}>
        {!task.archivedAt && !isCurrent && <button
          className={styles.textButton}
          disabled={pending}
          onClick={() => changeFocus(task)}
          aria-label={`${current ? "切换到此任务" : "开始专注"} · ${task.title}`}
        >{current ? "切换到此任务" : "开始专注"} <ArrowRightOutlined aria-hidden="true" /></button>}
        <button aria-label={`编辑任务 ${task.title}`} onClick={() => startTaskForm(task)}>编辑</button>
      </div>
      <details className={styles.more}>
        <summary>更多操作 <DownOutlined aria-hidden="true" /></summary>
        <div className={styles.rowButtons}>
          <button
            disabled={pending}
            onClick={() => void run({ kind: "archive-task", id: task.id, archived: !task.archivedAt })}
          >{task.archivedAt ? "恢复" : "归档"}</button>
          <button className={styles.dangerText} onClick={() => confirmDelete("删除任务", "任务及其行动会被删除，关联的独立记录会保留。", {
            kind: "delete-task", id: task.id,
          })}>删除</button>
        </div>
      </details>
      {actionsFor({ kind: "task", id: task.id }, !task.archivedAt)}
    </article>;
  }

  function noteCard(note: MindNoteDto) {
    const relatedTask = note.taskId ? taskById.get(note.taskId) : undefined;
    return <article className={styles.item} key={note.id}>
      <div className={styles.itemHeading}>
        <span className={styles.noteType}>{noteTypes[note.type]}</span>
        <time dateTime={note.createdAt}>{new Date(note.createdAt).toLocaleDateString("zh-CN")}</time>
        {relatedTask && <span className={styles.related}>{relatedTask.title}</span>}
      </div>
      <p className={styles.noteBody}>{note.content}</p>
      <div className={styles.rowButtons}>
        <button onClick={() => open({ kind: "note", note })}>编辑</button>
        <button
          disabled={pending}
          onClick={() => void run({ kind: "edit-note", id: note.id, setAside: !note.setAside })}
        >{note.setAside ? "恢复到暂存箱" : "暂时放下"}</button>
      </div>
      <details className={styles.more}>
        <summary>更多操作 <DownOutlined aria-hidden="true" /></summary>
        <div className={styles.rowButtons}>
          <button onClick={() => open({ kind: "link", note })}>关联任务</button>
          <button onClick={() => open({ kind: "convert", note })}>转为任务</button>
          <button onClick={() => open({ kind: "action", note })}>转为行动</button>
          <button className={styles.dangerText} onClick={() => confirmDelete("删除记录", "这条记录及其行动会被永久删除。", {
            kind: "delete-note", id: note.id,
          })}>删除</button>
        </div>
      </details>
      {actionsFor({ kind: "note", id: note.id }, false)}
    </article>;
  }

  const syncLabel = sync === "ready" ? "已同步" : sync === "failed" ? "同步异常" : "正在同步";
  const currentSection = sections.find(({ id }) => id === section)!;

  const today = new Date();
  const currentActions = current ? actionsByParent.get(`task:${current.id}`) ?? emptyActions : emptyActions;
  const switchList = current && waitingTasks.length ? waitingTasks : otherTasks;
  const counts = {
    focus: undefined, tasks: activeTasks.length, notes: inboxNotes.length,
    plan: actions?.filter((action) => !action.done).length, settings: undefined,
  };

  return <div className={styles.shell} lang="zh-CN">
    <header className={styles.topBar}>
      <div className={styles.brand}>
        <a href="/" aria-label="返回 Arrivo 首页"><img src="/favicon.svg" alt="" width="30" height="30" /> Arrivo</a>
        <span className={styles.divider} aria-hidden="true" />
        <span className={styles.productName}>心智切换</span>
      </div>
      <div className={styles.topActions}>
        <button className={styles.syncButton} onClick={() => moveTo("settings")} data-sync={sync}>
          <span aria-hidden="true" />{syncLabel}
        </button>
        <button className={styles.primary} onClick={() => open({ kind: "note" })} disabled={!snapshot}>
          <PlusOutlined aria-hidden="true" /> 快速记录
        </button>
      </div>
    </header>

    <div className={styles.layout}>
      <nav className={styles.sections} aria-label="心智切换功能">
        {sections.map(({ id, label, icon: Icon }) => <button
          key={id}
          aria-label={label}
          aria-current={section === id ? "page" : undefined}
          onClick={() => {
            moveTo(id);
            window.scrollTo(0, 0);
          }}
        ><Icon aria-hidden="true" /><span>{label}</span>
          {snapshot && Boolean(counts[id]) && <small aria-hidden="true">{counts[id]}</small>}
        </button>)}
      </nav>

      <main className={styles.main} aria-busy={sync === "loading"}>
        {sync === "failed" && <div className={styles.syncError} role="status">
          <span>无法同步，正在编辑的内容仍保留在页面。</span>
          <button onClick={() => void refresh(true)}>重新同步</button>
        </div>}
        {!snapshot && sync === "loading" && <p className={styles.empty} role="status">正在载入工作区…</p>}
        {!snapshot && sync === "failed" && <p className={styles.empty}>联网后即可打开工作区。</p>}
        {notice && <p className={notice.error ? styles.errorNotice : styles.notice} role={notice.error ? "alert" : "status"}>{notice.text}</p>}

        {snapshot && <div className={styles.pageHeading}>
          <h1>{section === "focus" ? "专注工作台" : currentSection.label}</h1>
          {section === "focus" && <span className={styles.date}><CalendarOutlined aria-hidden="true" />
            {today.toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" })}
          </span>}
          {section === "plan" && <button
            className={styles.primary}
            onClick={() => open({ kind: "action" })}
            disabled={!activeTasks.length && !notes?.length}
          ><PlusOutlined aria-hidden="true" /> 添加行动</button>}
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
          {section === "focus" && <section className={styles.focusPanel} aria-label="当前焦点">
            <div className={styles.focusCard}>
              <div className={styles.focusMeta}>
                <AimOutlined aria-hidden="true" /> 当前焦点{current && <Status status={current.status} />}
              </div>
              <h2>{current?.title ?? "此刻没有焦点"}</h2>
              {!current && <p className={styles.emptyFocus}>
                {canSwitch ? "选一件现在想做的事，接着上次的进度。" : "在「新建任务」写下第一件想做的事。"}
              </p>}
              {(canSwitch || current) && <div className={styles.buttons}>
                {canSwitch && <button className={styles.primary} disabled={pending} onClick={() => changeFocus(!current && otherTasks.length === 1 ? otherTasks[0] : undefined)}>
                  {current ? "切换任务" : "开始专注"} <ArrowRightOutlined aria-hidden="true" />
                </button>}
                {current && <button onClick={() => changeFocus(null)}>暂时休息</button>}
              </div>}
            </div>
            {contextTask && <div className={styles.context}>
              <div className={styles.sideHeading}>
                <h2><ReadOutlined aria-hidden="true" /> {editingTask ? "编辑任务" : "继续上次的进度"}</h2>
                {!editingTask && <button className={styles.textButton} onClick={() => startTaskForm(contextTask)}>
                  <EditOutlined aria-hidden="true" /> 编辑上下文
                </button>}
              </div>
              {editingTask
                ? <TaskEditor task={editingTask} save={saveTask} cancel={() => setEditingTask(null)} />
                : <div className={styles.contextGrid} key={contextTask.id}>
                    <ContextValue label="上次做到哪" value={contextTask.lastContext || "尚无备注"} />
                    <ContextValue label="下一步做什么" value={contextTask.nextAction || "尚无下一步"} />
                  </div>}
            </div>}
          </section>}
          <div className={styles.capture}>
            <TaskEditor save={saveTask} />
            {section === "focus" && switchList.length > 0 && <section className={styles.waiting}>
              <div className={styles.sideHeading}>
                <h2><SwapOutlined aria-hidden="true" /> {current && waitingTasks.length ? "后台等待" : "待切换任务"}</h2>
                <span className={styles.count}>{switchList.length}</span>
              </div>
              <ul className={styles.miniList}>
                {switchList.slice(0, 4).map((task) => <li key={task.id}>
                  <button disabled={pending} onClick={() => changeFocus(task)}>
                    <span>{task.title}</span><ArrowRightOutlined aria-hidden="true" />
                  </button>
                </li>)}
              </ul>
              {switchList.length > 4 && <button className={styles.textButton} onClick={() => moveTo("tasks")}>查看全部任务 <ArrowRightOutlined aria-hidden="true" /></button>}
            </section>}
          </div>
          {section === "focus" && current && <section className={styles.actionPanel}>
            <div className={styles.sideHeading}>
              <h2><CheckSquareOutlined aria-hidden="true" /> 行动计划</h2>
              {currentActions.length > 0 && <span className={styles.count}>
                {currentActions.filter((action) => action.done).length} / {currentActions.length} 已完成
              </span>}
            </div>
            {actionsFor({ kind: "task", id: current.id })}
          </section>}

          {section === "tasks" && <>
            <div className={styles.list}>{activeTasks.length ? activeTasks.map(taskCard) : <p className={styles.empty}>你的任务会出现在这里。</p>}</div>
            {archivedTasks.length > 0 && <details className={styles.fold}>
              <summary>已归档 <span>{archivedTasks.length}</span></summary>
              <div className={styles.list}>{archivedTasks.map(taskCard)}</div>
            </details>}
          </>}
        </div>}

        {snapshot && section === "notes" && <>
          <div className={styles.list}>{inboxNotes.length ? inboxNotes.map(noteCard) : <p className={styles.empty}>有想法、担忧或灵感，随时记下来。</p>}</div>
          {setAsideNotes.length > 0 && <details className={styles.fold}>
            <summary>已放下 <span>{setAsideNotes.length}</span></summary>
            <div className={styles.list}>{setAsideNotes.map(noteCard)}</div>
          </details>}
        </>}

        {snapshot && section === "plan" && (
          actions?.length
            ? actionRows(actions, true)
            : <p className={styles.empty}>
                {activeTasks.length || notes?.length ? "给任务或一条记录添加下一小步。" : "创建任务或记录后，就能为它添加行动。"}
              </p>
        )}

        {snapshot && section === "settings" && <div className={styles.list}>
          <section className={styles.item}>
            <h2>账号与同步</h2>
            <p>同一个 Arrivo 账号可在手机和电脑上使用。{lastSynced && `上次同步于 ${lastSynced.toLocaleTimeString("zh-CN")}。`}</p>
            <button onClick={() => void refresh(true)}>重新同步</button>
          </section>
          <section className={styles.item}>
            <h2>隐私与数据</h2>
            <p>任务、记录和行动只对当前账号可见。你可以导出数据，也可以清除这个功能的数据。</p>
            <div className={styles.buttons}>
              <button disabled={pending} onClick={() => void perform(exportWorkspace, "已请求下载数据")}>导出 JSON</button>
              <button className={styles.dangerText} onClick={() => confirmDelete(
                "清除心智切换数据",
                "当前账号的所有任务、记录和行动会被永久删除。语言复读数据不受影响。",
                { kind: "clear-workspace" },
              )}>清除数据</button>
            </div>
          </section>
        </div>}
      </main>

    </div>
  </div>;
}

function ContextValue({ label, value }: { label: string; value: string }) {
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

  return <div>
    <h3>{label}</h3>
    <p ref={text} id={id} className={expanded ? undefined : styles.contextPreview}>{value}</p>
    {long && <button
      className={styles.expandContext}
      aria-controls={id}
      aria-expanded={expanded}
      aria-label={`${expanded ? "收起" : "展开全文"} · ${label}`}
      onClick={() => setExpanded(!expanded)}
    >{expanded ? "收起" : "展开全文"} <DownOutlined aria-hidden="true" /></button>}
  </div>;
}

function Status({ status }: { status: MindTaskDto["status"] }) {
  return <span className={styles.status} data-status={status}>{taskStatuses[status]}</span>;
}
