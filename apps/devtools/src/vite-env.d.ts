/// <reference types="vite/client" />

// Provides ambient types for Vite features used by the panel source:
//  - `import.meta.env` (including the custom VITE_MOCK_EXAMPLE var below)
//  - CSS Modules imports (`*.module.scss`, `*.module.css`, ...) via vite/client
//
// See scripts/preview-dev.mjs, which sets VITE_MOCK_EXAMPLE for the local mock preview.

interface ImportMetaEnv {
  /**
   * Mock example seeded into the local preview page (index.local.html -> index.dev.tsx).
   * Set by `yarn preview:dev [example]`. Unknown/empty values fall back to 'devtools'.
   */
  readonly VITE_MOCK_EXAMPLE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
