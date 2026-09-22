import '@src/base.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MainTab } from './MainTab';
import { mainTab$ } from './context';
import './util/getContentScriptPort';
import { startAgentBridge } from './agentBridge/agentBridge';
import { startPageWatcher } from './util/pageWatcher';

startAgentBridge();
startPageWatcher();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <mainTab$.Provider>
      <MainTab />
    </mainTab$.Provider>
  </StrictMode>
);
