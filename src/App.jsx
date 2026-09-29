import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertCircle, ArrowRight, Bot, CalendarClock, Check, ChevronDown,
  CircleDot, Clock3, Flag, GitBranch, Link2, Loader2, MessageSquare, Plus, RefreshCw,
  Search, Send, Settings2, Sparkles, UserRound, X,
} from 'lucide-react';
import { api, buildCreateTaskPayload, normalizeBoard, resolveBoardName } from './api.js';
import { STATUSES, statusLabel } from './status.js';

const iconByStatus = { triage: CircleDot, todo: Clock3, scheduled: CalendarClock, ready: ArrowRight, running: Activity, blocked: AlertCircle, review: Search, done: Check };
const PRIORITY_LABELS = ['普通', '较高', '高', '紧急'];
const initialForm = { title: '', body: '', assignee: '', priority: 0, workspace_kind: 'dir', workspace_path: '/worktrees/folder-1', parents: [], triage: false };
const displayTime = (epoch) => epoch ? new Date(epoch * 1000).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const clampPriority = (priority) => Math.min(3, Math.max(0, Number(priority) || 0));

function App() {
  const [boardName, setBoardName] = useState('');
  const [boards, setBoards] = useState([]);
  const [board, setBoard] = useState(() => normalizeBoard());
  const [profiles, setProfiles] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [log, setLog] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [query, setQuery] = useState('');
  const [profileFilter, setProfileFilter] = useState('');
  const [comment, setComment] = useState('');
  const [linkId, setLinkId] = useState('');
  const [saving, setSaving] = useState(false);

  const flash = (message) => { setNotice(message); window.setTimeout(() => setNotice(''), 2500); };

  const loadBoard = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    try {
      const [boardData, workerData] = await Promise.all([
        api.board(boardName),
        api.workers(boardName).catch(() => ({ workers: [] })),
      ]);
      setBoard(normalizeBoard(boardData));
      setWorkers(workerData.workers || []);
      setError('');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [boardName]);

  const loadMeta = useCallback(async () => {
    const [boardData, profileData] = await Promise.all([
      api.boards().catch(() => ({ boards: [] })),
      api.profiles().catch(() => ({ profiles: [] })),
    ]);
    const availableBoards = boardData.boards || [];
    const initialBoard = resolveBoardName(localStorage.getItem('hermes-kanban-board'), availableBoards, boardData.current);
    setBoards(availableBoards);
    setProfiles(profileData.profiles || []);
    setBoardName(initialBoard);
  }, []);

  const loadDetail = useCallback(async (id) => {
    if (!id) return;
    try {
      const [data, logData] = await Promise.all([
        api.task(id, boardName),
        api.taskLog(id, boardName).catch(() => ({ content: '' })),
      ]);
      setDetail(data);
      setLog(logData.content || '');
    } catch (e) { setError(e.message); }
  }, [boardName]);

  useEffect(() => { loadMeta(); }, [loadMeta]);
  useEffect(() => {
    if (!boardName) return;
    localStorage.setItem('hermes-kanban-board', boardName);
    loadBoard();
  }, [boardName, loadBoard]);
  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
    else { setDetail(null); setLog(''); }
  }, [selectedId, loadDetail]);
  // Poll the board (and the open task) every 5 seconds.
  useEffect(() => {
    const timer = window.setInterval(() => { loadBoard(true); if (selectedId) loadDetail(selectedId); }, 5000);
    return () => clearInterval(timer);
  }, [loadBoard, loadDetail, selectedId]);
  // Escape closes the topmost overlay.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      if (showCreate) setShowCreate(false);
      else if (selectedId) closeDrawer();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showCreate, selectedId]);

  const tasks = useMemo(() => STATUSES.flatMap((status) => board.columns[status] || []), [board]);
  const filteredColumns = useMemo(() => Object.fromEntries(STATUSES.map((status) => [status, (board.columns[status] || []).filter((task) => {
    const matchesQuery = !query || `${task.title} ${task.body || ''} ${task.id}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (!profileFilter || task.assignee === profileFilter);
  })])), [board, query, profileFilter]);

  async function mutate(work, success) {
    setSaving(true);
    try { await work(); flash(success); await loadBoard(true); if (selectedId) await loadDetail(selectedId); }
    catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function createTask(event) {
    event.preventDefault();
    if (!form.title.trim()) return;
    await mutate(() => api.createTask(buildCreateTaskPayload(form), boardName), '任务已创建');
    setForm(initialForm);
    setShowCreate(false);
  }

  function openCreate(status) {
    setForm({ ...initialForm, triage: status === 'triage' });
    setShowCreate(true);
  }

  function closeDrawer() { setSelectedId(null); setDetail(null); }

  const boardTitle = boards.find((b) => b.slug === boardName)?.name || boardName;
  const blockedCount = (board.columns.blocked || []).length;

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">H</div>
        <div><strong>Hermes</strong><span>工作看板</span></div>
      </div>
      <div className="board-picker-wrap">
        <span className="muted">看板</span>
        <div className="select-wrap">
          <select aria-label="切换看板" value={boardName} onChange={(e) => { closeDrawer(); setBoardName(e.target.value); }}>
            {boards.length
              ? boards.map((item) => <option key={item.slug} value={item.slug}>{item.icon || '▣'} {item.name || item.slug}</option>)
              : <option value={boardName}>{boardName}</option>}
          </select>
          <ChevronDown size={14}/>
        </div>
      </div>
      <div className="top-actions">
        <div className="worker-pill"><span className={workers.length ? 'live-dot active' : 'live-dot'}/>{workers.length} 个工作进程</div>
        <button className="icon-button" title="刷新" aria-label="刷新" onClick={() => loadBoard()}><RefreshCw size={17} className={refreshing ? 'spin' : ''}/></button>
        <button className="primary-button" onClick={() => openCreate()}><Plus size={17}/>新建任务</button>
      </div>
    </header>

    <main>
      <section className="intro">
        <div>
          <p className="eyebrow">项目工作区</p>
          <h1>{boardTitle}</h1>
          <p>规划、分派并跟踪 Hermes 智能体的工作。</p>
        </div>
        <div className="summary">
          <Stat value={tasks.length} label="全部任务"/>
          <Stat value={workers.length} label="正在运行" tone="running"/>
          <Stat value={blockedCount} label="需要关注" tone={blockedCount ? 'blocked' : undefined}/>
        </div>
      </section>

      <section className="toolbar">
        <label className="search"><Search size={16}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索任务…"/></label>
        <div className="select-wrap filter">
          <UserRound size={15}/>
          <select aria-label="按负责人筛选" value={profileFilter} onChange={(e) => setProfileFilter(e.target.value)}>
            <option value="">所有负责人</option>
            {profiles.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
          </select>
          <ChevronDown size={14}/>
        </div>
        <div className="poll-note"><span className="live-dot active"/>每 5 秒同步</div>
      </section>

      {error && <div className="error-banner" role="alert"><AlertCircle size={16}/><span>{error}</span><button aria-label="关闭" onClick={() => setError('')}><X size={15}/></button></div>}

      {loading
        ? <div className="loading"><Loader2 className="spin"/>正在读取看板…</div>
        : <section className="kanban" aria-label="任务看板">
          {STATUSES.map((status) => <Column key={status} status={status} tasks={filteredColumns[status]} onOpen={setSelectedId} onCreate={() => openCreate(status)}/>)}
        </section>}
    </main>

    {showCreate && <Modal title="新建任务" onClose={() => setShowCreate(false)}>
      <TaskForm form={form} setForm={setForm} profiles={profiles} tasks={tasks} onSubmit={createTask} onCancel={() => setShowCreate(false)} saving={saving}/>
    </Modal>}
    {selectedId && <Drawer detail={detail} log={log} tasks={tasks} profiles={profiles} boardName={boardName} comment={comment} setComment={setComment} linkId={linkId} setLinkId={setLinkId} saving={saving} onClose={closeDrawer} onOpen={setSelectedId} mutate={mutate}/>}
    {notice && <div className="toast" role="status"><Check size={16}/>{notice}</div>}
  </div>;
}

function Stat({ value, label, tone }) {
  return <div className={`stat ${tone ? `tone-${tone}` : ''}`}><b>{value}</b><span>{label}</span></div>;
}

function Avatar({ name, size = 20 }) {
  if (!name) return <span className="avatar empty" style={{ width: size, height: size }}><UserRound size={size * 0.6}/></span>;
  const hue = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) * 37 % 360;
  return <span className="avatar" style={{ width: size, height: size, '--hue': hue }}>{name.slice(0, 1).toUpperCase()}</span>;
}

function Column({ status, tasks, onOpen, onCreate }) {
  const Icon = iconByStatus[status];
  return <article className={`column status-${status}`}>
    <header>
      <div><span className="column-icon"><Icon size={14}/></span><strong>{statusLabel(status)}</strong><span>{tasks.length}</span></div>
      <button aria-label={`在${statusLabel(status)}中新建`} onClick={onCreate}><Plus size={16}/></button>
    </header>
    <div className="card-list">
      {tasks.map((task) => <TaskCard task={task} key={task.id} onClick={() => onOpen(task.id)}/>)}
      {!tasks.length && <button className="empty-column" onClick={onCreate}><Plus size={14}/>暂无任务</button>}
    </div>
  </article>;
}

function TaskCard({ task, onClick }) {
  const priority = clampPriority(task.priority);
  return <button className={`task-card p-${priority}`} onClick={onClick}>
    <div className="card-top">
      {priority > 0
        ? <span className={`priority p-${priority}`}><Flag size={10}/>{PRIORITY_LABELS[priority]}</span>
        : <span className="priority">{task.tenant || '任务'}</span>}
      {task.status === 'running' && <Loader2 size={14} className="spin running-spinner"/>}
    </div>
    <h3>{task.title}</h3>
    <footer>
      <span className="card-assignee"><Avatar name={task.assignee} size={18}/>{task.assignee || '未分派'}</span>
      <span className="card-metrics">
        {task.link_counts?.parents > 0 && <i title="前置任务"><GitBranch size={13}/>{task.link_counts.parents}</i>}
        {task.comment_count > 0 && <i title="评论"><MessageSquare size={13}/>{task.comment_count}</i>}
      </span>
    </footer>
  </button>;
}

function Modal({ title, children, onClose }) {
  return <div className="modal-backdrop" onMouseDown={onClose}>
    <section className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
      <header><h2>{title}</h2><button aria-label="关闭" onClick={onClose}><X size={19}/></button></header>
      {children}
    </section>
  </div>;
}

function PrioritySelect(props) {
  return <select {...props}>{PRIORITY_LABELS.map((label, value) => <option key={value} value={value}>{label}</option>)}</select>;
}

function TaskForm({ form, setForm, profiles, tasks, onSubmit, onCancel, saving }) {
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  return <form className="task-form" onSubmit={onSubmit}>
    <label>任务标题<input autoFocus required value={form.title} onChange={set('title')} placeholder="要完成什么？"/></label>
    <label>详细说明<textarea rows="5" value={form.body} onChange={set('body')} placeholder="背景、验收标准和注意事项…"/></label>
    <div className="form-grid">
      <label>负责人<select value={form.assignee} onChange={set('assignee')}><option value="">暂不分派</option>{profiles.map((p) => <option key={p.name}>{p.name}</option>)}</select></label>
      <label>优先级<PrioritySelect value={form.priority} onChange={set('priority')}/></label>
    </div>
    <label>前置任务 <span className="field-hint">可多选；全部完成后当前任务才会进入就绪</span>
      <select className="parent-select" multiple value={form.parents} onChange={(e) => setForm({ ...form, parents: [...e.target.selectedOptions].map((option) => option.value) })}>
        {tasks.filter((task) => task.status !== 'archived').map((task) => <option key={task.id} value={task.id}>{statusLabel(task.status)} · {task.title}</option>)}
      </select>
    </label>
    <label>项目路径<input value={form.workspace_path} onChange={set('workspace_path')}/></label>
    <label className="check"><input type="checkbox" checked={form.triage} onChange={(e) => setForm({ ...form, triage: e.target.checked })}/>先放入待分诊</label>
    <div className="form-actions">
      <button type="button" className="secondary-button" onClick={onCancel}>取消</button>
      <button className="primary-button" disabled={saving}>{saving && <Loader2 className="spin" size={15}/>}创建任务</button>
    </div>
  </form>;
}

function Drawer({ detail, log, tasks, profiles, boardName, comment, setComment, linkId, setLinkId, saving, onClose, onOpen, mutate }) {
  if (!detail) return <><div className="drawer-shade" onClick={onClose}/><aside className="drawer"><div className="loading"><Loader2 className="spin"/>加载任务…</div></aside></>;
  const task = detail.task;
  const saveFields = (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    mutate(() => api.updateTask(task.id, { title: data.get('title'), body: data.get('body'), priority: Number(data.get('priority')), assignee: data.get('assignee') }, boardName), '任务已保存');
  };
  const move = (status) => mutate(() => api.updateTask(task.id, { status }, boardName), `已移动到${statusLabel(status)}`);
  const addComment = (event) => { event.preventDefault(); if (!comment.trim()) return; mutate(() => api.comment(task.id, comment.trim(), boardName), '评论已添加'); setComment(''); };
  const addLink = (event) => { event.preventDefault(); if (!linkId) return; mutate(() => api.addLink(linkId, task.id, boardName), '依赖已添加'); setLinkId(''); };

  return <>
    <div className="drawer-shade" onClick={onClose}/>
    <aside className="drawer" aria-label="任务详情">
      <header className="drawer-head">
        <div><span className={`status-chip status-${task.status}`}>{statusLabel(task.status)}</span><code>{task.id}</code></div>
        <button aria-label="关闭" onClick={onClose}><X size={20}/></button>
      </header>
      <div className="drawer-scroll">
        {/* key resets the uncontrolled inputs when another task is opened */}
        <form className="edit-form" key={task.id} onSubmit={saveFields}>
          <input className="title-input" name="title" aria-label="任务标题" defaultValue={task.title}/>
          <textarea className="body-input" name="body" rows="5" aria-label="任务说明" defaultValue={task.body || ''} placeholder="添加任务说明…"/>
          <div className="property-grid">
            <label><span><UserRound size={14}/>负责人</span><select name="assignee" defaultValue={task.assignee || ''}><option value="">未分派</option>{profiles.map((p) => <option key={p.name}>{p.name}</option>)}</select></label>
            <label><span><Settings2 size={14}/>优先级</span><PrioritySelect name="priority" defaultValue={clampPriority(task.priority)}/></label>
            <label><span><Clock3 size={14}/>创建时间</span><b>{displayTime(task.created_at)}</b></label>
            <label><span><Bot size={14}/>工作区</span><b title={task.workspace_path}>{task.workspace_kind || 'scratch'}</b></label>
            <label className="full-row"><span><Sparkles size={14}/>加载技能</span>
              <b>{task.skills?.length
                ? <span className="skill-list">{task.skills.map((s) => <span className="skill-tag" key={s}>{s}</span>)}</span>
                : <span className="muted skill-empty">无预加载技能（使用默认 kanban-worker）</span>}</b>
            </label>
          </div>
          <button className="secondary-button save-button" disabled={saving}>{saving && <Loader2 className="spin" size={14}/>}保存修改</button>
        </form>

        <section className="drawer-section">
          <h3>移动状态</h3>
          <div className="status-actions">
            {STATUSES.filter((s) => s !== task.status && s !== 'running').map((s) => <button key={s} className={`status-${s}`} onClick={() => move(s)}><span className="status-dot"/>{statusLabel(s)}</button>)}
          </div>
        </section>

        <section className="drawer-section">
          <h3><Link2 size={16}/>依赖关系</h3>
          {detail.links.parents.map((id) => <div className="relation" key={id}>
            <span>依赖于 <button onClick={() => onOpen(id)}>{tasks.find((t) => t.id === id)?.title || id}</button></span>
            <button title="移除" aria-label="移除依赖" onClick={() => mutate(() => api.removeLink(id, task.id, boardName), '依赖已移除')}><X size={15}/></button>
          </div>)}
          <form className="inline-form" onSubmit={addLink}>
            <select value={linkId} onChange={(e) => setLinkId(e.target.value)}>
              <option value="">添加前置任务…</option>
              {tasks.filter((t) => t.id !== task.id && !detail.links.parents.includes(t.id)).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
            <button aria-label="添加依赖"><Plus size={16}/></button>
          </form>
        </section>

        <section className="drawer-section">
          <h3><MessageSquare size={16}/>评论 <span>{detail.comments.length}</span></h3>
          <div className="comments">
            {detail.comments.map((item) => <div className="comment-item" key={item.id}>
              <Avatar name={item.author} size={26}/>
              <div><div className="comment-meta"><b>{item.author}</b><time>{displayTime(item.created_at)}</time></div><p>{item.body}</p></div>
            </div>)}
            {!detail.comments.length && <p className="muted">还没有评论。</p>}
          </div>
          <form className="comment-form" onSubmit={addComment}>
            <textarea rows="3" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="写下进展、问题或决定…"/>
            <button className="primary-button"><Send size={15}/>发送</button>
          </form>
        </section>

        <section className="drawer-section">
          <h3><Activity size={16}/>运行记录 <span>{detail.runs.length}</span></h3>
          {detail.runs.map((run) => <div className="run-row" key={run.id}>
            <span className={`live-dot ${!run.ended_at ? 'active' : ''}`}/>
            <div><b>{run.profile || task.assignee || 'worker'}</b><p>{run.summary || run.outcome || run.status}</p></div>
            <time>{displayTime(run.started_at)}</time>
          </div>)}
          {log && <pre className="worker-log">{log}</pre>}
          {!detail.runs.length && !log && <p className="muted">暂无工作进程日志。</p>}
        </section>
      </div>
    </aside>
  </>;
}

export default App;
