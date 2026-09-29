import { describe, expect, it } from 'vitest';
import { classifyLogLine, splitLog } from './log.js';

describe('worker log helpers', () => {
  it('splits logs into lines, normalising line endings and dropping the trailing newline', () => {
    expect(splitLog('a\r\nb\rc\n').map((line) => line.text)).toEqual(['a', 'b', 'c']);
    expect(splitLog('')).toEqual([]);
  });

  it('tags errors, warnings, successes and shell commands', () => {
    expect(classifyLogLine('Traceback (most recent call last):')).toBe('err');
    expect(classifyLogLine('[worker] task failed')).toBe('err');
    expect(classifyLogLine('WARNING: disk almost full')).toBe('warn');
    expect(classifyLogLine('12 tests passed')).toBe('ok');
    expect(classifyLogLine('$ npm test')).toBe('cmd');
    expect(classifyLogLine('plain output')).toBe('');
  });

  it('prefers the error tag when a line matches several rules', () => {
    expect(classifyLogLine('3 passed, 1 failed')).toBe('err');
  });
});
