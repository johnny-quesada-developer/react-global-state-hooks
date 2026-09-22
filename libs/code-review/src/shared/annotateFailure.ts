import fs from 'node:fs';
import path from 'node:path';

const commentStyles: Record<string, { open: string; close: string }> = {
  '.py': { open: '#', close: '' },
  '.sh': { open: '#', close: '' },
  '.yml': { open: '#', close: '' },
  '.yaml': { open: '#', close: '' },
  '.md': { open: '<!--', close: ' -->' },
  '.html': { open: '<!--', close: ' -->' },
};

const singleLine = (text: string) => text.replace(/\s+/g, ' ').trim().slice(0, 300);

export const todoMarker = (ruleId: string) => `[TODO] code-review(${ruleId})`;

export function annotateFailure({
  file,
  ruleId,
  reason,
}: {
  file: string;
  ruleId: string;
  reason: string;
}): boolean {
  if (!fs.existsSync(file)) return false;
  const { open, close } = commentStyles[path.extname(file)] ?? { open: '//', close: '' };
  const marker = todoMarker(ruleId);
  const todoLine = `${open} ${marker}: ${singleLine(reason)}${close}`;

  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const existingIndex = lines.findIndex((line) => line.includes(marker));
  const updatedLines =
    existingIndex === -1
      ? [todoLine, ...lines]
      : lines.map((line, index) => (index === existingIndex ? todoLine : line));

  fs.writeFileSync(file, updatedLines.join('\n'));
  return true;
}
