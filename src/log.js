// Worker log helpers: split the raw log into lines and tag each one for highlighting.

const RULES = [
  ['err', /\b(error|exception|traceback|fatal|failed|failure|panic)\b|^\s*E\s|✗|❌/i],
  ['warn', /\bwarn(ing)?\b|⚠/i],
  ['ok', /\b(success(ful(ly)?)?|succeeded|passed|completed|done)\b|✓|✅/i],
  ['cmd', /^\s*(\$|>|❯)\s/],
];

export function classifyLogLine(line) {
  return RULES.find(([, pattern]) => pattern.test(line))?.[0] || '';
}

export function splitLog(log) {
  if (!log) return [];
  const lines = log.replace(/\r\n?/g, '\n').split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return lines.map((text) => ({ text, kind: classifyLogLine(text) }));
}
