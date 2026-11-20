import { useMemo, useRef, useState } from "react";
import {
  AimOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  BulbOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  SettingOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import type { MindActionDto, MindNoteDto, MindSwitchChange, MindTaskDto } from "@arrivo/contracts";
import { mindSwitchError } from "@/lib/mind-switch-api";
import { Dialog, noteTypes } from "./dialogs";
import type { ActionParent, MindDialog } from "./dialogs";
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
  const [dialog, setDialog] = useState<MindDialog | null>(null);
  const [taskForm, setTaskForm] = useState<{ task?: MindTaskDto } | null>(null);
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
  const contextTask = taskForm?.task ?? current;
  const activeTasks = tasks?.filter((task) => !task.archivedAt) ?? [];
  const archivedTasks = tasks?.filter((task) => task.archivedAt) ?? [];
  const waitingTasks = activeTasks.filter((task) => task.status === "WAITING" && task.id !== current?.id);
  const inboxNotes = notes?.filter((note) => !note.setAside) ?? [];
  const setAsideNotes = notes?.filter((note) => note.setAside) ?? [];
  const canSwitch = activeTasks.some((task) => task.id !== current?.id);

  function moveTo(view: Section) {
    setSection(view);
    setTaskForm(null);
    setNotice(null);
  }

  function startTaskForm(task?: MindTaskDto) {
    if (acting.current) return;
    if (!task) setSection("tasks");
    setTaskForm({ task });
    setNotice(null);
  }

  async function saveTask(input: MindSwitchChange) {
    const submittedForm = taskForm;
    await change(input);
    setTaskForm((currentForm) => currentForm === submittedForm ? null : currentForm);
    setNotice({ text: "任务已保存" });
  }

  function open(nextDialog: MindDialog) {
    if (acting.current) return;
    setNotice(null);
    setDialog(nextDialog);
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
    return <div className={styles.steps}>
      {actionRows(items)}
      {canAdd && <button className={styles.textButton} onClick={() => open({ kind: "action", parent })}>
        <PlusOutlined aria-hidden="true" /> 添加行动
      </button>}
    </div>;
  }

  function taskCard(task: MindTaskDto) {
    if (taskForm?.task?.id === task.id) {
      return <article className={styles.item} key={task.id}>
        <TaskEditor task={taskForm.task} save={saveTask} cancel={() => setTaskForm(null)} />
      </article>;
    }
    return <article className={styles.item} key={task.id}>
      <div className={styles.itemHeading}>
        <h2>{task.title}</h2>
        <Status status={task.status} />
        {current?.id === task.id && <span className={styles.currentBadge}>当前焦点</span>}
      </div>
      {task.nextAction && <p className={styles.itemSnippet}>下一步 · {task.nextAction}</p>}
      <div className={styles.rowButtons}>
        {!task.archivedAt && current?.id !== task.id && <button
          onClick={() => changeFocus(task)}
          aria-label={`切换到 ${task.title}`}
        >切换到此任务 <ArrowRightOutlined aria-hidden="true" /></button>}
        <button aria-label={`编辑任务 ${task.title}`} onClick={() => startTaskForm(task)}>编辑</button>
        <button
          disabled={pending}
          onClick={() => void run({ kind: "archive-task", id: task.id, archived: !task.archivedAt })}
        >{task.archivedAt ? "恢复" : "归档"}</button>
        <button onClick={() => confirmDelete("删除任务", "任务及其行动会被删除，关联的独立记录会保留。", {
          kind: "delete-task", id: task.id,
        })}>删除</button>
      </div>
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
        <button onClick={() => open({ kind: "link", note })}>关联任务</button>
        <button onClick={() => open({ kind: "convert", note })}>转为任务</button>
        <button onClick={() => open({ kind: "action", note })}>转为行动</button>
        <button
          disabled={pending}
          onClick={() => void run({ kind: "edit-note", id: note.id, setAside: !note.setAside })}
        >{note.setAside ? "恢复到暂存箱" : "暂时放下"}</button>
        <button onClick={() => confirmDelete("删除记录", "这条记录及其行动会被永久删除。", {
          kind: "delete-note", id: note.id,
        })}>删除</button>
      </div>
      {actionsFor({ kind: "note", id: note.id }, false)}
    </article>;
  }

  function taskList(items: MindTaskDto[]) {
    return <ul className={styles.miniList}>
      {items.map((task) => <li key={task.id}>
        <button
          className={task.id === current?.id ? styles.selectedTask : undefined}
          onClick={() => {
            if (task.id === current?.id) moveTo("focus");
            else changeFocus(task);
          }}
        >
          <span>{task.title}</span>
          {task.id === current?.id ? <AimOutlined aria-hidden="true" /> : <ArrowRightOutlined aria-hidden="true" />}
        </button>
      </li>)}
    </ul>;
  }

  const syncLabel = sync === "ready" ? "已同步" : sync === "failed" ? "同步异常" : "正在同步";
  const currentSection = sections.find(({ id }) => id === section)!;

  return <div className={styles.shell} lang="zh-CN">
    <header className={styles.topBar}>
      <div className={styles.brand}>
        <a href="/" aria-label="返回 Arrivo 首页"><ArrowLeftOutlined aria-hidden="true" /> <span>Arrivo</span></a>
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
      <aside className={styles.sidebar}>
        <nav className={styles.sections} aria-label="心智切换功能">
          {sections.map(({ id, label, icon: Icon }) => <button
            key={id}
            aria-current={section === id ? "page" : undefined}
            onClick={() => moveTo(id)}
          ><Icon aria-hidden="true" /> {label}</button>)}
        </nav>

        {snapshot && <div className={styles.sideTasks}>
          <div className={styles.sideHeading}>
            <h2>我的任务</h2>
            <button className={styles.iconButton} aria-label="新建任务" onClick={() => startTaskForm()}><PlusOutlined aria-hidden="true" /></button>
          </div>
          {activeTasks.length ? taskList(activeTasks) : <p>还没有任务</p>}
        </div>}
      </aside>

      <main className={styles.main} aria-busy={sync === "loading"}>
        {sync === "failed" && <div className={styles.syncError} role="status">
          <span>无法同步，正在编辑的内容仍保留在页面。</span>
          <button onClick={() => void refresh(true)}>重新同步</button>
        </div>}
        {!snapshot && sync === "loading" && <p className={styles.empty} role="status">正在载入工作区…</p>}
        {!snapshot && sync === "failed" && <p className={styles.empty}>联网后即可打开工作区。</p>}
        {notice && <p className={notice.error ? styles.errorNotice : styles.notice} role={notice.error ? "alert" : "status"}>{notice.text}</p>}

        {snapshot && section === "focus" && <>
          <div className={styles.pageHeading}><h1>我现在正在做什么？</h1></div>
          <div className={styles.focusCard}>
            <div className={styles.focusMeta}><AimOutlined aria-hidden="true" /> 当前焦点{current && <Status status={current.status} />}</div>
            <h2>{current?.title ?? "此刻没有焦点"}</h2>
            {!current && <p className={styles.emptyFocus}>
              {canSwitch ? "选一件现在想做的事，也可以先休息。" : "先建一件想做的事，准备好时再开始。"}
            </p>}
            <div className={styles.buttons}>
              {canSwitch && <button className={styles.primary} onClick={() => changeFocus()}>
                切换任务 <ArrowRightOutlined aria-hidden="true" />
              </button>}
              {!canSwitch && <button className={styles.primary} onClick={() => startTaskForm()}>
                <PlusOutlined aria-hidden="true" /> 新建任务
              </button>}
              {current && <button onClick={() => changeFocus(null)}>暂时休息</button>}
            </div>
          </div>
          {contextTask && <div className={styles.context}>
            <div className={styles.sideHeading}>
              <h2>{taskForm?.task ? "编辑任务" : "继续上次的进度"}</h2>
              {!taskForm?.task && <button className={styles.textButton} onClick={() => startTaskForm(contextTask)}>编辑上下文</button>}
            </div>
            {taskForm?.task
              ? <TaskEditor task={taskForm.task} save={saveTask} cancel={() => setTaskForm(null)} />
              : <div className={styles.contextGrid}>
                  <div><h3>上次做到哪</h3><p>{contextTask.lastContext || "尚无备注"}</p></div>
                  <div><h3>下一步做什么</h3><p>{contextTask.nextAction || "尚无下一步"}</p></div>
                </div>}
          </div>}
          {current && <section className={styles.context}>
            <h2>行动计划</h2>
            {actionsFor({ kind: "task", id: current.id })}
          </section>}
        </>}

        {snapshot && section !== "focus" && <div className={styles.pageHeading}>
          <h1>{currentSection.label}</h1>
          {section === "tasks" && <button className={styles.primary} onClick={() => startTaskForm()}><PlusOutlined aria-hidden="true" /> 新建任务</button>}
          {section === "plan" && <button
            className={styles.primary}
            onClick={() => open({ kind: "action" })}
            disabled={!activeTasks.length && !notes?.length}
          ><PlusOutlined aria-hidden="true" /> 添加行动</button>}
        </div>}

        {snapshot && section === "tasks" && <>
          {taskForm && !taskForm.task && <div className={styles.newTask}>
            <TaskEditor save={saveTask} cancel={() => setTaskForm(null)} />
          </div>}
          <div className={styles.list}>{activeTasks.length ? activeTasks.map(taskCard) : <p className={styles.empty}>创建一条任务，随时切换回来。</p>}</div>
          {archivedTasks.length > 0 && <details className={styles.fold}>
            <summary>已归档 <span>{archivedTasks.length}</span></summary>
            <div className={styles.list}>{archivedTasks.map(taskCard)}</div>
          </details>}
        </>}

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

      {snapshot && section === "focus" && <aside className={styles.waiting}>
        <h2><ClockCircleOutlined aria-hidden="true" /> 后台等待</h2>
        {waitingTasks.length ? taskList(waitingTasks) : <p>没有等待中的任务</p>}
      </aside>}
    </div>
    {snapshot && dialog && <Dialog dialog={dialog} snapshot={snapshot} close={() => setDialog(null)} save={save} />}
  </div>;
}

function Status({ status }: { status: MindTaskDto["status"] }) {
  return <span className={styles.status} data-status={status}>{taskStatuses[status]}</span>;
}
