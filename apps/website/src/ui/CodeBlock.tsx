import { highlight, type CodeLanguage } from '../lib/highlight';

interface CodeBlockProps {
  code: string;
  lang?: CodeLanguage;
  title?: string;
  className?: string;
}

/** Build-time syntax highlighting (light theme). Rendered to static HTML, never hydrated. */
export function CodeBlock({ code, lang = 'tsx', title, className = '' }: CodeBlockProps) {
  return (
    <figure className={`code-block mx-0 overflow-hidden rounded-md border border-line bg-bg shadow-sm ${className}`.trim()}>
      {title && (
        <figcaption className="flex justify-between gap-3 border-b border-line bg-mint px-4 py-2 font-mono text-sm">
          {title}
        </figcaption>
      )}
      <div dangerouslySetInnerHTML={{ __html: highlight(code, lang) }} />
    </figure>
  );
}
