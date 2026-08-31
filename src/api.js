import { STATUSES } from './status.js';

export function apiPath(path, board, params = {}) {
  const search = new URLSearchParams();
  if (board) search.set('board', board);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const query = search.toString();
  return `/api${path}${query ? `?${query}` : ''}`;
}

export function dependencyPayload(parentId, childId) {
  return { parent_id: parentId, child_id: childId };
}

export function normalizeBoard(data = {}) {
  const columns = Object.fromEntries(STATUSES.map((status) => [status, []]));
  if (Array.isArray(data.columns)) {
    data.columns.forEach((column) => { if (columns[column.name]) columns[column.name] = column.tasks || []; });
  } else if (data.columns && typeof data.columns === 'object') {
    Object.entries(data.columns).forEach(([name, tasks]) => { if (columns[name]) columns[name] = tasks || []; });
  }
  // Hermes can return both pre-grouped columns and a flattened task list.
  // Use the flat list only as a fallback, otherwise cards render twice.
  const hasColumnTasks = Object.values(columns).some((tasks) => tasks.length > 0);
  if (!hasColumnTasks) {
    (data.tasks || []).forEach((task) => { (columns[task.status] || columns.todo).push(task); });
  }
  return { ...data, columns };
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) throw new Error(body?.detail || body?.error || `请求失败 (${response.status})`);
  return body;
}

export const api = {
  boards: () => request('/api/boards'),
  board: (board) => request(apiPath('/board', board)),
  profiles: () => request('/api/profiles'),
  workers: (board) => request(apiPath('/workers/active', board)),
  task: (id, board) => request(apiPath(`/tasks/${encodeURIComponent(id)}`, board)),
  taskLog: (id, board) => request(apiPath(`/tasks/${encodeURIComponent(id)}/log`, board, { tail: 200000 })),
  createTask: (payload, board) => request(apiPath('/tasks', board), { method: 'POST', body: JSON.stringify(payload) }),
  updateTask: (id, payload, board) => request(apiPath(`/tasks/${encodeURIComponent(id)}`, board), { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteTask: (id, board) => request(apiPath(`/tasks/${encodeURIComponent(id)}`, board), { method: 'DELETE' }),
  comment: (id, body, board) => request(apiPath(`/tasks/${encodeURIComponent(id)}/comments`, board), { method: 'POST', body: JSON.stringify({ body, author: 'kanban-ui' }) }),
  addLink: (parentId, childId, board) => request(apiPath('/links', board), { method: 'POST', body: JSON.stringify(dependencyPayload(parentId, childId)) }),
  removeLink: (parentId, childId, board) => request(apiPath('/links', board, dependencyPayload(parentId, childId)), { method: 'DELETE' }),
};
