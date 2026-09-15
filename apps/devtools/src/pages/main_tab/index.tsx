import '@src/base.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MainTab } from './MainTab';
import { mainTab$ } from './context';
import './util/getContentScriptPort';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <mainTab$.Provider>
      <MainTab />
    </mainTab$.Provider>
  </StrictMode>
);
