import { describe, expect, it } from 'vitest';
import { apiPath, buildCreateTaskPayload, dependencyPayload, normalizeBoard, resolveBoardName } from './api.js';
describe('API helpers', () => {
  it('adds board query safely', () => expect(apiPath('/board','hermes-kanban')).toBe('/api/board?board=hermes-kanban'));
  it('builds parent-child dependency direction', () => expect(dependencyPayload('parent','child')).toEqual({parent_id:'parent',child_id:'child'}));
  it('normalizes board columns', () => {
    const b=normalizeBoard({columns:{ready:[{id:'1'}]},tasks:[]});
    expect(b.columns.done).toEqual([]); expect(b.columns.ready[0].id).toBe('1');
  });
  it('does not duplicate flattened tasks when columns are present', () => {
    const task={id:'1',status:'ready'};
    const b=normalizeBoard({columns:{ready:[task]},tasks:[task]});
    expect(b.columns.ready).toHaveLength(1);
  });
  it('includes selected parent ids atomically when creating a task', () => {
    const payload=buildCreateTaskPayload({title:' 子任务 ',priority:'2',assignee:'',parents:['t_a','t_b']});
    expect(payload).toMatchObject({title:'子任务',priority:2,assignee:null,parents:['t_a','t_b']});
  });
  it('uses the API current board when the stored board is stale', () => {
    const boards=[{slug:'default'},{slug:'xhs-run'}];
    expect(resolveBoardName('hermes-kanban', boards, 'xhs-run')).toBe('xhs-run');
  });
  it('preserves a stored board that still exists', () => {
    const boards=[{slug:'default'},{slug:'xhs-run'}];
    expect(resolveBoardName('default', boards, 'xhs-run')).toBe('default');
  });
  it('falls back to the first board when current is unavailable', () => {
    const boards=[{slug:'default'},{slug:'xhs-run'}];
    expect(resolveBoardName(null, boards)).toBe('default');
    expect(resolveBoardName('missing', boards, 'also-missing')).toBe('default');
  });
});