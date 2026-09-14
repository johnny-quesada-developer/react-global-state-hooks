// Local preview entry point.
//
// This mirrors src/index.tsx but seeds the panel with mock data so it can be
// previewed without a real page/extension connection. It is only referenced by
// index.local.html and is never part of the production extension build.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MainTab } from './pages/main_tab/MainTab';
import '@src/base.css';
import mainTab$ from './pages/main_tab/context/mainTabContext.ts';
import { generateMockState } from './helpers/generateMockState.ts';
import { loadMockState } from './pages/main_tab/hooks/globalStates/helpers/loadMockState.ts';

// Chosen via `yarn preview:dev <example>` -> VITE_MOCK_EXAMPLE -> import.meta.env.
// generateMockState falls back to 'devtools' for unknown/empty values.
loadMockState(generateMockState(import.meta.env.VITE_MOCK_EXAMPLE));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <mainTab$.Provider>
      <MainTab />
    </mainTab$.Provider>
  </StrictMode>
);
