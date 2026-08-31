import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertCircle, ArrowRight, Bot, CalendarClock, Check, ChevronDown,
  CircleDot, Clock3, GitBranch, Link2, Loader2, MessageSquare, Plus, RefreshCw,
  Search, Send, Settings2, UserRound, X,
} from 'lucide-react';
import { api, normalizeBoard } from './api.js';
import { STATUSES, statusLabel } from './status.js';

const iconByStatus = { triage: CircleDot, todo: Clock3, scheduled: CalendarClock, ready: ArrowRight, running: Activity, blocked: AlertCircle, review: Search, done: Check };
const initialForm = { title: '', body: '', assignee: '', priority: 0, workspace_kind: 'dir', workspace_path: '/worktrees/folder-1/vibe-kanban-src', triage: false };
const displayTime = (epoch) => epoch ? new Date(epoch * 1000).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

function App() {
  const [boardName, setBoardName] = useState(localStorage.getItem('hermes-kanban-board') || 'vibe-kanban-source');
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
      const [boardData, workerData] = await Promise.all([api.board(boardName), api.workers(boardName).catch(() => ({ workers: [] }))]);
      setBoard(normalizeBoard(boardData));
      setWorkers(workerData.workers || []);
      setError('');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [boardName]);

  const loadMeta = useCallback(async () => {
    const [boardData, profileData] = await Promise.all([api.boards().catch(() => ({ boards: [] })), api.profiles().catch(() => ({ profiles: [] }))]);
    setBoards(boardData.boards || []); setProfiles(profileData.profiles || []);
  }, []);

  const loadDetail = useCallback(async (id) => {
    if (!id) return;
    try {
      const [data, logData] = await Promise.all([api.task(id, boardName), api.taskLog(id, boardName).catch(() => ({ content: '' }))]);
      setDetail(data); setLog(logData.content || '');
    } catch (e) { setError(e.message); }
  }, [boardName]);

  useEffect(() => { localStorage.setItem('hermes-kanban-board', boardName); loadMeta(); loadBoard(); }, [boardName, loadBoard, loadMeta]);
  useEffect(() => { if (selectedId) loadDetail(selectedId); else { setDetail(null); setLog(''); } }, [selectedId, loadDetail]);
  useEffect(() => { const timer = window.setInterval(() => { loadBoard(true); if (selectedId) loadDetail(selectedId); }, 5000); return () => clearInterval(timer); }, [loadBoard, loadDetail, selectedId]);

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
    await mutate(() => api.createTask({ ...form, title: form.title.trim(), priority: Number(form.priority), assignee: form.assignee || null }, boardName), '任务已创建');
    setForm(initialForm); setShowCreate(false);
  }

  function closeDrawer() { setSelectedId(null); setDetail(null); }

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark">H</div><div><strong>Hermes</strong><span>工作看板</span></div></div>
      <div className="board-picker-wrap"><span className="muted">看板</span><div className="select-wrap"><select aria-label="切换看板" value={boardName} onChange={(e) => { closeDrawer(); setBoardName(e.target.value); }}>
        {boards.length ? boards.map((item) => <option key={item.slug} value={item.slug}>{item.icon || '▣'} {item.name || item.slug}</option>) : <option value={boardName}>{boardName}</option>}
      </select><ChevronDown size={14}/></div></div>
      <div className="top-actions"><div className="worker-pill"><span className={workers.length ? 'live-dot active' : 'live-dot'} />{workers.length} 个工作进程</div><button className="icon-button" title="刷新" onClick={() => loadBoard()}><RefreshCw size={17} className={refreshing ? 'spin' : ''}/></button><button className="primary-button" onClick={() => setShowCreate(true)}><Plus size={17}/>新建任务</button></div>
    </header>

    <main>
      <section className="intro"><div><p className="eyebrow">项目工作区</p><h1>{boards.find((b) => b.slug === boardName)?.name || boardName}</h1><p>规划、分派并跟踪 Hermes 智能体的工作。</p></div><div className="summary"><span><b>{tasks.length}</b> 全部任务</span><span><b>{workers.length}</b> 正在运行</span><span><b>{(board.columns.blocked || []).length}</b> 需要关注</span></div></section>
      <section className="toolbar"><label className="search"><Search size={16}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索任务…"/></label><div className="select-wrap filter"><UserRound size={15}/><select value={profileFilter} onChange={(e) => setProfileFilter(e.target.value)}><option value="">所有负责人</option>{profiles.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}</select><ChevronDown size={14}/></div><div className="poll-note"><RefreshCw size={13}/>每 5 秒同步</div></section>

      {error && <div className="error-banner"><AlertCircle size={16}/><span>{error}</span><button onClick={() => setError('')}><X size={15}/></button></div>}
      {loading ? <div className="loading"><Loader2 className="spin"/>正在读取看板…</div> : <section className="kanban" aria-label="任务看板">
        {STATUSES.map((status) => <Column key={status} status={status} tasks={filteredColumns[status]} onOpen={setSelectedId} onCreate={() => { setForm({ ...initialForm, triage: status === 'triage' }); setShowCreate(true); }}/>) }
      </section>}
    </main>

    {showCreate && <Modal title="新建任务" onClose={() => setShowCreate(false)}><TaskForm form={form} setForm={setForm} profiles={profiles} onSubmit={createTask} onCancel={() => setShowCreate(false)} saving={saving}/></Modal>}
    {selectedId && <Drawer detail={detail} log={log} tasks={tasks} profiles={profiles} boardName={boardName} comment={comment} setComment={setComment} linkId={linkId} setLinkId={setLinkId} saving={saving} onClose={closeDrawer} mutate={mutate}/>} 
    {notice && <div className="toast"><Check size={16}/>{notice}</div>}
  </div>;
}

function Column({ status, tasks, onOpen, onCreate }) {
  const Icon = iconByStatus[status];
  return <article className={`column status-${status}`}><header><div><Icon size={15}/><strong>{statusLabel(status)}</strong><span>{tasks.length}</span></div><button aria-label={`在${statusLabel(status)}中新建`} onClick={onCreate}><Plus size={16}/></button></header><div className="card-list">
    {tasks.map((task) => <TaskCard task={task} key={task.id} onClick={() => onOpen(task.id)}/>)}
    {!tasks.length && <div className="empty-column">暂无任务</div>}
  </div></article>;
}

function TaskCard({ task, onClick }) {
  return <button className="task-card" onClick={onClick}><div className="card-top"><span className={`priority p-${Math.min(3, Math.max(0, task.priority || 0))}`}>{task.priority > 1 ? '高优先级' : task.tenant || '任务'}</span>{task.status === 'running' && <Loader2 size={14} className="spin"/>}</div><h3>{task.title}</h3>{(task.latest_summary || task.body) && <p>{task.latest_summary || task.body}</p>}<footer><span><UserRound size={13}/>{task.assignee || '未分派'}</span><span className="card-metrics">{task.link_counts?.parents > 0 && <i><GitBranch size={13}/>{task.link_counts.parents}</i>}{task.comment_count > 0 && <i><MessageSquare size={13}/>{task.comment_count}</i>}</span></footer></button>;
}

function Modal({ title, children, onClose }) { return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal" onMouseDown={(e) => e.stopPropagation()}><header><h2>{title}</h2><button onClick={onClose}><X size={19}/></button></header>{children}</section></div>; }

function TaskForm({ form, setForm, profiles, onSubmit, onCancel, saving }) { return <form className="task-form" onSubmit={onSubmit}><label>任务标题<input autoFocus required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="要完成什么？"/></label><label>详细说明<textarea rows="5" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="背景、验收标准和注意事项…"/></label><div className="form-grid"><label>负责人<select value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })}><option value="">暂不分派</option>{profiles.map((p) => <option key={p.name}>{p.name}</option>)}</select></label><label>优先级<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option value="0">普通</option><option value="1">较高</option><option value="2">高</option><option value="3">紧急</option></select></label></div><label>项目路径<input value={form.workspace_path} onChange={(e) => setForm({ ...form, workspace_path: e.target.value })}/></label><label className="check"><input type="checkbox" checked={form.triage} onChange={(e) => setForm({ ...form, triage: e.target.checked })}/>先放入待分诊</label><div className="form-actions"><button type="button" className="secondary-button" onClick={onCancel}>取消</button><button className="primary-button" disabled={saving}>{saving && <Loader2 className="spin" size={15}/>}创建任务</button></div></form>; }

function Drawer({ detail, log, tasks, profiles, boardName, comment, setComment, linkId, setLinkId, saving, onClose, mutate }) {
  if (!detail) return <aside className="drawer"><div className="loading"><Loader2 className="spin"/>加载任务…</div></aside>;
  const task = detail.task;
  const saveFields = (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); mutate(() => api.updateTask(task.id, { title: data.get('title'), body: data.get('body'), priority: Number(data.get('priority')), assignee: data.get('assignee') }, boardName), '任务已保存'); };
  const move = (status) => mutate(() => api.updateTask(task.id, { status }, boardName), `已移动到${statusLabel(status)}`);
  const addComment = (event) => { event.preventDefault(); if (!comment.trim()) return; mutate(() => api.comment(task.id, comment.trim(), boardName), '评论已添加'); setComment(''); };
  const addLink = (event) => { event.preventDefault(); if (!linkId) return; mutate(() => api.addLink(linkId, task.id, boardName), '依赖已添加'); setLinkId(''); };
  return <><div className="drawer-shade" onClick={onClose}/><aside className="drawer"><header className="drawer-head"><div><span className={`status-chip status-${task.status}`}>{statusLabel(task.status)}</span><code>{task.id}</code></div><button onClick={onClose}><X size={20}/></button></header><div className="drawer-scroll">
    <form className="edit-form" onSubmit={saveFields}><input className="title-input" name="title" defaultValue={task.title}/><textarea className="body-input" name="body" rows="5" defaultValue={task.body || ''} placeholder="添加任务说明…"/><div className="property-grid"><label><span><UserRound size={14}/>负责人</span><select name="assignee" defaultValue={task.assignee || ''}><option value="">未分派</option>{profiles.map((p) => <option key={p.name}>{p.name}</option>)}</select></label><label><span><Settings2 size={14}/>优先级</span><select name="priority" defaultValue={task.priority || 0}><option value="0">普通</option><option value="1">较高</option><option value="2">高</option><option value="3">紧急</option></select></label><label><span><Clock3 size={14}/>创建时间</span><b>{displayTime(task.created_at)}</b></label><label><span><Bot size={14}/>工作区</span><b title={task.workspace_path}>{task.workspace_kind || 'scratch'}</b></label></div><button className="secondary-button save-button" disabled={saving}>保存修改</button></form>
    <section className="drawer-section"><h3>移动状态</h3><div className="status-actions">{STATUSES.filter((s) => s !== task.status && s !== 'running').map((s) => <button key={s} onClick={() => move(s)}>{statusLabel(s)}</button>)}</div></section>
    <section className="drawer-section"><h3><Link2 size={16}/>依赖关系</h3>{detail.links.parents.map((id) => <div className="relation" key={id}><span>依赖于 <button onClick={() => {}}>{tasks.find((t) => t.id === id)?.title || id}</button></span><button title="移除" onClick={() => mutate(() => api.removeLink(id, task.id, boardName), '依赖已移除')}><X size={15}/></button></div>)}<form className="inline-form" onSubmit={addLink}><select value={linkId} onChange={(e) => setLinkId(e.target.value)}><option value="">添加前置任务…</option>{tasks.filter((t) => t.id !== task.id && !detail.links.parents.includes(t.id)).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select><button><Plus size={16}/></button></form></section>
    <section className="drawer-section"><h3><MessageSquare size={16}/>评论 <span>{detail.comments.length}</span></h3><div className="comments">{detail.comments.map((item) => <div className="comment-item" key={item.id}><div><b>{item.author}</b><time>{displayTime(item.created_at)}</time></div><p>{item.body}</p></div>)}{!detail.comments.length && <p className="muted">还没有评论。</p>}</div><form className="comment-form" onSubmit={addComment}><textarea rows="3" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="写下进展、问题或决定…"/><button className="primary-button"><Send size={15}/>发送</button></form></section>
    <section className="drawer-section"><h3><Activity size={16}/>运行记录 <span>{detail.runs.length}</span></h3>{detail.runs.map((run) => <div className="run-row" key={run.id}><span className={`live-dot ${!run.ended_at ? 'active' : ''}`}/><div><b>{run.profile || task.assignee || 'worker'}</b><p>{run.summary || run.outcome || run.status}</p></div><time>{displayTime(run.started_at)}</time></div>)}{log && <pre className="worker-log">{log}</pre>}{!detail.runs.length && !log && <p className="muted">暂无工作进程日志。</p>}</section>
  </div></aside></>;
}

export default App;
