export const STATUSES = ['triage', 'todo', 'scheduled', 'ready', 'running', 'blocked', 'review', 'done'];

export const STATUS_LABELS = {
  triage: '待分诊', todo: '待办', scheduled: '已计划', ready: '就绪',
  running: '进行中', blocked: '已阻塞', review: '待审查', done: '已完成', archived: '已归档',
};

export function statusLabel(status) {
  return STATUS_LABELS[status] || status || '未知';
}

export function nextStatusForAction(status, action) {
  const transitions = {
    continue: { blocked: 'ready', scheduled: 'ready' },
    approve: { review: 'done' },
    start: { triage: 'todo', todo: 'ready' },
    review: { running: 'review', ready: 'review' },
    reopen: { done: 'todo', review: 'todo' },
    block: { todo: 'blocked', ready: 'blocked', running: 'blocked', review: 'blocked' },
  };
  return transitions[action]?.[status] || status;
}

export function canSetStatus(status) {
  return status !== 'running';
}
