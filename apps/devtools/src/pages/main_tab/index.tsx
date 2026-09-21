import '@src/base.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MainTab } from './MainTab';
import { mainTab$ } from './context';
import './util/getContentScriptPort';
import { startAgentBridge } from './agentBridge/agentBridge';

startAgentBridge();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <mainTab$.Provider>
      <MainTab />
    </mainTab$.Provider>
  </StrictMode>
);
