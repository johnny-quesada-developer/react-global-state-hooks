import { highlight, type CodeLanguage } from '../lib/highlight';

interface CodeBlockProps {
  code: string;
  lang?: CodeLanguage;
  title?: string;
}

/** Build-time syntax highlighting (light theme). Rendered to static HTML, never hydrated. */
export function CodeBlock({ code, lang = 'tsx', title }: CodeBlockProps) {
  return (
    <figure className="code-block">
      {title && <figcaption className="code-block__title">{title}</figcaption>}
      <div dangerouslySetInnerHTML={{ __html: highlight(code, lang) }} />
    </figure>
  );
}
