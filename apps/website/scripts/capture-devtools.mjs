#!/usr/bin/env node
/**
 * Captures the DevTools screenshots for the website from the LIVE playground and the INSTALLED extension
 * panel. No mock, no image generation. Each scenario saves two separate images (the playground UI and the
 * extension panel) so the site can present them side by side.
 *
 * Prerequisites (see scripts/README-devtools-capture.md):
 *   1. yarn nx run playground:dev                       # http://localhost:5199/
 *   2. A Chrome started with --remote-debugging-port=9222 and its own --user-data-dir, with the extension
 *      (apps/devtools/dist, loaded unpacked) and DevTools open on the playground tab, panel selected.
 *
 *   node scripts/capture-devtools.mjs
 *
 * Environment: CDP_URL (default http://127.0.0.1:9222), APP_URL (default http://localhost:5199/)
 *
 * Writes public/devtools/*.png and src/data/devtools-shots.json (dimensions and scenario data).
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const outDir = path.join(root, 'public/devtools');
const dataFile = path.join(root, 'src/data/devtools-shots.json');
const CDP_URL = process.env.CDP_URL ?? 'http://127.0.0.1:9222';
const APP_URL = process.env.APP_URL ?? 'http://localhost:5199/';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function until(check, label, timeout = 15000) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeout) {
    try {
      last = await check();
      if (last) return last;
    } catch (error) {
      last = error;
    }
    await sleep(150);
  }
  throw new Error(`Timed out waiting for: ${label}${last instanceof Error ? ` (${last.message})` : ''}`);
}

const browser = await chromium.connectOverCDP(CDP_URL);
const pages = browser.contexts().flatMap((context) => context.pages());
const app = pages.find((page) => page.url().startsWith(APP_URL.replace(/\/$/, '')));
const devtools = pages.find((page) => page.url().startsWith('devtools://'));

if (!app) throw new Error(`No tab open at ${APP_URL}. Open the playground in the capture Chrome.`);
if (!devtools)
  throw new Error('DevTools is not open on the playground tab. Open it and select the extension panel.');

/** The extension panel is an out-of-process iframe; its URL is only readable from inside the frame. */
async function findPanel() {
  return until(async () => {
    for (const frame of devtools.frames()) {
      const href = await frame.evaluate(() => location.href).catch(() => '');
      if (href.includes('/main_tab.html')) return frame;
    }
    return null;
  }, 'the extension panel frame (main_tab.html). Is the panel selected in DevTools?');
}

const panel = await findPanel();
const appPanelText = () => panel.locator('body').innerText();

// A clean start: the panel must be open before the page reloads, so both sides synchronize.
await app.reload();
await app.waitForLoadState('load');
await panel.locator('[data-testid=store-item]').first().waitFor({ timeout: 20000 });
const stores = await panel
  .locator('[data-testid=store-item]')
  .evaluateAll((items) => items.map((item) => item.dataset.storeName));
for (const name of ['counter', 'todos']) {
  if (!stores.includes(name))
    throw new Error(`Store "${name}" is not listed in the panel. Stores: ${stores.join(', ')}`);
}

// Prefer the existing light theme.
const isDark = await panel.evaluate(() => document.documentElement.classList.contains('dark'));
if (isDark) {
  await panel.getByRole('button', { name: 'Settings' }).click();
  const themeItem = panel.getByRole('menuitem', { name: /theme|light/i }).first();
  await themeItem.click();
  await until(
    () => panel.evaluate(() => !document.documentElement.classList.contains('dark')),
    'light theme',
  );
}

const counterCard = app.locator('section', { has: app.getByRole('heading', { name: /^Counter/ }) });
const todosCard = app.locator('section', { has: app.getByRole('heading', { name: /^Todos/ }) });
const counterValue = () => counterCard.locator('p').first().innerText();

const shots = [];

async function capture(id, { title, scenarioData, target }) {
  fs.mkdirSync(outDir, { recursive: true });
  const appFile = `${id}-app.png`;
  const panelFile = `${id}-panel.png`;

  await target.screenshot({ path: path.join(outDir, appFile) });
  await panel.locator('body').screenshot({ path: path.join(outDir, panelFile) });

  const size = async (file) => {
    const { width, height } = await sharp(path.join(outDir, file)).metadata();
    if (!width || !height) throw new Error(`${file} has no dimensions`);
    return { width, height };
  };

  shots.push({
    id,
    title,
    scenarioData,
    app: { file: appFile, ...(await size(appFile)) },
    panel: { file: panelFile, ...(await size(panelFile)) },
  });
  console.log(
    `[capture] ${id}: app ${shots.at(-1).app.width}x${shots.at(-1).app.height}, panel ${shots.at(-1).panel.width}x${shots.at(-1).panel.height}`,
  );
}

const selectStore = async (name) => {
  await panel.locator(`[data-testid=store-item][data-store-name="${name}"]`).click();
  // the panel may still be on another tab from a previous run: always look at the logs of the store
  await panel.locator('[data-testid=tab-logs]').click();
  // the logs pane of the selected store reports its record count
  await until(async () => /Records: \d+/.test(await appPanelText()), `logs of store "${name}" visible`);
};

// ---------------------------------------------------------------- 1. track state changes
await selectStore('counter');
await panel.locator('[data-testid=tab-logs]').click();
for (let i = 0; i < 3; i++) await counterCard.getByRole('button', { name: '+1', exact: true }).click();
await until(async () => (await counterValue()) === '3', 'page counter = 3');
await until(
  async () => /Records: 4/.test(await appPanelText()),
  'panel shows 4 records (initialize + 3 setState)',
);
await capture('track-state-changes', {
  title: 'Track state changes',
  scenarioData:
    'counter store: initial 0, three clicks on +1 -> 3. Panel: Logs tab, "counter" selected, 4 records.',
  target: counterCard,
});

// ---------------------------------------------------------------- 2. restore a previous state
await panel.locator('[data-testid=action-log-item]').nth(1).hover();
await panel
  .locator('[data-testid=action-log-item]')
  .nth(1)
  .getByRole('button', { name: 'Log actions' })
  .click();
await panel.getByRole('menuitem', { name: 'Restore state' }).click();
await panel.getByRole('dialog').getByRole('button', { name: 'Restore', exact: true }).click();
await until(async () => (await counterValue()) === '1', 'page counter restored to 1');
await capture('restore-the-state', {
  title: 'Restore a previous state',
  scenarioData: 'counter store: restored from the second log entry (value 1) back from 3.',
  target: counterCard,
});

// ---------------------------------------------------------------- 3. edit the state from the panel
await panel.locator('[data-testid=tab-state]').click();
const editor = panel.locator('.cm-content').last();
await editor.click();
await devtools.keyboard.press('Meta+A');
await devtools.keyboard.type('42');
await panel.getByRole('button', { name: 'Set State' }).last().click();
await until(async () => (await counterValue()) === '42', 'page counter edited to 42');
await capture('modify-the-state', {
  title: 'Edit the state',
  scenarioData: 'counter store: value 42 typed into the State tab editor and applied with Set State.',
  target: counterCard,
});

// ---------------------------------------------------------------- 4. action details
await selectStore('todos');
await panel.locator('[data-testid=tab-logs]').click();
await todosCard.getByPlaceholder('new todo').fill('Write the docs');
await todosCard.getByRole('button', { name: 'add', exact: true }).click();
await until(async () => (await todosCard.getByText('Write the docs').count()) > 0, 'todo added on the page');
await until(
  async () =>
    (await panel.locator('[data-testid=action-log-item]').count()) > 0 &&
    /\badd\b/.test(await appPanelText()),
  'panel shows the add action',
);
const addRow = panel.locator('[data-testid=action-log-item]', { hasText: 'add' }).first();
await addRow.locator('button').first().click();
await sleep(400);
await capture('custom-actions-granularity', {
  title: 'Action details',
  scenarioData:
    'todos store (actions): "Write the docs" added with the add action. Panel: Logs tab, add action selected.',
  target: todosCard,
});

// ---------------------------------------------------------------- metadata
const libraryVersion = JSON.parse(
  fs.readFileSync(path.resolve(root, '../../libs/universal/package.json'), 'utf8'),
).version;
const commit = (() => {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root }).toString().trim();
  } catch {
    return 'unknown';
  }
})();

fs.mkdirSync(path.dirname(dataFile), { recursive: true });
fs.writeFileSync(
  dataFile,
  JSON.stringify(
    { capturedWith: { libraryVersion, commit, chrome: browser.version(), theme: 'light' }, shots },
    null,
    2,
  ) + '\n',
);

console.log(
  `[capture] ${shots.length} scenarios written to public/devtools and src/data/devtools-shots.json`,
);
await browser.close();
