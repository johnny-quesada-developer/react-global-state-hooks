export const DOC_SECTIONS = [
  'Getting started',
  'Core concepts',
  'API reference',
  'Guides and recipes',
  'TypeScript',
  'Testing and troubleshooting',
  'DevTools',
  'Platform and version considerations',
] as const;

export type DocSection = (typeof DOC_SECTIONS)[number];
