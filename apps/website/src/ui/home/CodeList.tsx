import { useReducedMotion } from '../../state/motion';

const token = /(\/\/.*$|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|\b(?:import|from|export|const|let|function|return|true|false|null|type)\b|\b\d+\b|\b[A-Za-z_$][\w$]*(?=\())/g;
const keywords = /^(import|from|export|const|let|function|return|true|false|null|type)$/;

function tokens(line: string) {
  const parts: { text: string; className?: string }[] = [];
  let cursor = 0;

  for (const match of line.matchAll(token)) {
    const index = match.index ?? 0;
    if (index > cursor) parts.push({ text: line.slice(cursor, index) });
    const value = match[0];
    let className = 't-function';
    if (value.startsWith('//')) className = 't-comment';
    else if (value.startsWith("'") || value.startsWith('"')) className = 't-string';
    else if (/^\d/.test(value)) className = 't-number';
    else if (keywords.test(value)) className = 't-keyword';
    parts.push({ text: value, className });
    cursor = index + value.length;
  }
  if (cursor < line.length) parts.push({ text: line.slice(cursor) });

  return parts;
}

interface CodeListProps {
  code: string;
  emphasis?: number[];
  shell?: boolean;
  /** Changes when the code should re-enter (chapter switch). */
  animationKey?: string | number;
  className?: string;
  label: string;
}

/** Animated, selectable code for the marketing sequences (reference `.code-list`). */
export function CodeList({ code, emphasis = [], shell = false, animationKey, className = '', label }: CodeListProps) {
  const reduced = useReducedMotion();
  const lines = code.split('\n');

  return (
    <pre className={`code-list ${shell ? 'is-terminal' : ''} ${className}`.trim()} aria-label={label} key={animationKey}>
      <code>
        {lines.map((line, index) => (
          <span
            className={`code-line ${!reduced ? 'line-enter' : ''} ${emphasis.includes(index) ? 'emphasis' : ''}`.trim()}
            style={{ animationDelay: `${Math.min(index * 14, 100)}ms` }}
            key={`${animationKey}-${index}`}
          >
            <span className="ln" aria-hidden="true">
              {index + 1}
            </span>
            {shell && line.startsWith('$') ? (
              <span className="t-shell">{line}</span>
            ) : line ? (
              tokens(line).map((part, position) => (
                <span className={part.className} key={position}>
                  {part.text}
                </span>
              ))
            ) : (
              ' '
            )}
          </span>
        ))}
      </code>
    </pre>
  );
}
