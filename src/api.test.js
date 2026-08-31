import { describe, expect, it } from 'vitest';
import { apiPath, dependencyPayload, normalizeBoard } from './api.js';
describe('API helpers', () => {
  it('adds board query safely', () => expect(apiPath('/board','vibe-kanban-source')).toBe('/api/board?board=vibe-kanban-source'));
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
});