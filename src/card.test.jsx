import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const app = fs.readFileSync(path.resolve(process.cwd(), 'src/App.jsx'), 'utf8');

function taskCardSource() {
  const start = app.indexOf('function TaskCard');
  const end = app.indexOf('\nfunction Modal', start);
  return app.slice(start, end);
}

describe('TaskCard', () => {
  it('shows only the task title as card content', () => {
    const source = taskCardSource();
    expect(source).toContain('<h3>{task.title}</h3>');
    expect(source).not.toContain('task.latest_summary');
    expect(source).not.toContain('task.body');
  });
});
