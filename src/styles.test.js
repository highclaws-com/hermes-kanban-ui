import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(path.resolve(process.cwd(), 'src/styles.css'), 'utf8');

function rule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return css.match(new RegExp(`${escaped}\\{([^}]*)\\}`))?.[1] || '';
}

describe('Kanban horizontal scrolling', () => {
  it('uses the viewport scrollbar instead of a scrollbar below the tallest column', () => {
    expect(rule('body')).toContain('overflow-x:auto');
    expect(rule('.kanban')).toContain('overflow-x:visible');
    expect(rule('.kanban')).toContain('width:max-content');
    expect(rule('.kanban')).toContain('min-width:100%');
  });

  it('lets the whole application canvas, including the top bar, share that width', () => {
    expect(rule('.app-shell')).toContain('width:max-content');
    expect(rule('.app-shell')).toContain('min-width:100%');
    expect(rule('.topbar')).toContain('width:100%');
  });
});
