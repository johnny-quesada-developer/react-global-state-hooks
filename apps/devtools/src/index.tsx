// import './vite-env';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MainTab } from './pages/main_tab/MainTab';
import '@src/base.css';
import mainTab$ from './pages/main_tab/context/mainTabContext.ts';
import { PanelErrorBoundary } from './pages/main_tab/PanelErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PanelErrorBoundary>
      <mainTab$.Provider>
        <MainTab />
      </mainTab$.Provider>
    </PanelErrorBoundary>
  </StrictMode>
);
