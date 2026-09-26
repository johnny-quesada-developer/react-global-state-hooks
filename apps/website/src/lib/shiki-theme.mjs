/**
 * The reference code palette as a Shiki theme: keywords in the composition blue, strings in green,
 * comments muted, everything else in the reading ink. Shared by the build-time highlighter
 * (src/lib/highlight.ts) and Astro's fenced-code highlighting (astro.config.mjs).
 */
export const rgshLight = {
  name: 'rgsh-light',
  type: 'light',
  colors: { 'editor.background': '#fbfcfa', 'editor.foreground': '#414a43' },
  settings: [{ settings: { foreground: '#414a43', background: '#fbfcfa' } }],
  tokenColors: [
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#808a82' } },
    { scope: ['string', 'string.template', 'punctuation.definition.string'], settings: { foreground: '#397454' } },
    {
      scope: ['keyword', 'storage', 'storage.type', 'keyword.control', 'keyword.operator.new', 'keyword.operator.expression', 'variable.language.this'],
      settings: { foreground: '#53658c' },
    },
    { scope: ['constant.numeric', 'constant.language'], settings: { foreground: '#956a42' } },
    { scope: ['entity.name.function', 'support.function', 'meta.function-call entity.name.function'], settings: { foreground: '#4d658a' } },
    { scope: ['entity.name.type', 'support.type', 'entity.name.tag'], settings: { foreground: '#414a43' } },
    { scope: ['keyword.operator', 'punctuation'], settings: { foreground: '#414a43' } },
  ],
};
