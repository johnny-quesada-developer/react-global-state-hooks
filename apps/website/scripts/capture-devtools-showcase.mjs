#!/usr/bin/env node
/**
 * Capture the running playground and extension panel for the website.
 * Setup: README-devtools-capture.md.
 *
 *   node scripts/capture-devtools-showcase.mjs
 *
 * Writes public/devtools/showcase/*.png and src/data/devtools-showcase.json.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const outDir = path.join(root, 'public/devtools/showcase');
const dataFile = path.join(root, 'src/data/devtools-showcase.json');
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
if (!app) throw new Error(`No tab open at ${APP_URL}.`);
if (!devtools)
  throw new Error('DevTools is not open on the playground tab. Open it and select the extension panel.');

const panel = await until(async () => {
  for (const frame of devtools.frames()) {
    const href = await frame.evaluate(() => location.href).catch(() => '');
    if (href.includes('/main_tab.html')) return frame;
  }
  return null;
}, 'the extension panel frame (main_tab.html)');

const panelText = () => panel.locator('body').innerText();

// The panel is open before the reload, so both sides synchronize.
await app.reload();
await app.waitForLoadState('load');
await panel.locator('[data-testid=store-item]').first().waitFor({ timeout: 20000 });

if (await panel.evaluate(() => document.documentElement.classList.contains('dark'))) {
  await panel.getByRole('button', { name: 'Settings' }).click();
  await panel
    .getByRole('menuitem', { name: /theme|light/i })
    .first()
    .click();
  await until(
    () => panel.evaluate(() => !document.documentElement.classList.contains('dark')),
    'light theme',
  );
}

const counterCard = app.locator('section', { has: app.getByRole('heading', { name: /^Counter/ }) });
const todosCard = app.locator('section', { has: app.getByRole('heading', { name: /^Todos/ }) });
const counterValue = () => counterCard.locator('p').first().innerText();
// The panel's main pane (right of the store list): the largest `flex-grow` container in the panel.
const rightArea = async () => {
  await panel.evaluate(() => {
    document
      .querySelectorAll('[data-showcase-area]')
      .forEach((el) => el.removeAttribute('data-showcase-area'));
    let best = null;
    let bestArea = 0;
    for (const el of document.querySelectorAll('div.flex-grow.min-w-3')) {
      const r = el.getBoundingClientRect();
      if (r.x > 200 && r.width * r.height > bestArea) {
        best = el;
        bestArea = r.width * r.height;
      }
    }
    best?.setAttribute('data-showcase-area', 'true');
  });
  return panel.locator('[data-showcase-area]');
};

/**
 * Element screenshots inside the out-of-process extension frame fail Playwright's "stable" check, so take the
 * element's box (in DevTools window coordinates) and clip the window screenshot to it.
 */
async function clipShot(locator, file) {
  await locator.waitFor({ state: 'visible' });
  const box = await until(async () => {
    const value = await locator.boundingBox();
    return value && value.width > 20 && value.height > 20 ? value : null;
  }, 'element box');

  // A clipped page.screenshot hangs on the DevTools window, so crop a full-window capture instead.
  const window = await devtools.screenshot();
  const { width, height } = await sharp(window).metadata();
  const left = Math.max(0, Math.floor(box.x));
  const top = Math.max(0, Math.floor(box.y));
  await sharp(window)
    .extract({
      left,
      top,
      width: Math.min(width - left, Math.ceil(box.width)),
      height: Math.min(height - top, Math.ceil(box.height)),
    })
    .toFile(file);
}

const shots = [];

async function save(id, title, take) {
  fs.mkdirSync(outDir, { recursive: true });
  const file = `${id}.png`;
  await take(path.join(outDir, file));
  const { width, height } = await sharp(path.join(outDir, file)).metadata();
  if (!width || !height) throw new Error(`${file} has no dimensions`);
  shots.push({ id, title, file, width, height });
  console.log(`[showcase] ${file} ${width}x${height}`);
}

const selectStore = async (name) => {
  await panel.locator(`[data-testid=store-item][data-store-name="${name}"]`).click();
  await panel.locator('[data-testid=tab-logs]').click();
  await until(async () => /Records: \d+/.test(await panelText()), `logs of "${name}"`);
};

// ------------------------------------------------ data: counter 0 -> 1 -> 2 -> 3 -> 13
await selectStore('counter');
for (let i = 0; i < 3; i++) await counterCard.getByRole('button', { name: '+1', exact: true }).click();
await counterCard.getByRole('button', { name: '+10', exact: true }).click();
await until(async () => (await counterValue()) === '13', 'page counter = 13');
await until(
  async () => /Records: 5/.test(await panelText()),
  'panel shows 5 records (initialize + 4 setState)',
);

// select the third entry so the change details are shown
await panel.locator('[data-testid=action-log-item]').nth(2).locator('button').first().click();
await until(() => panel.locator('.StateDiffPerAction').isVisible(), 'change details visible');
await sleep(300);

await save('app', 'The playground app', (p) => app.screenshot({ path: p }));
await save('whole-screen', 'The whole DevTools window', (p) => devtools.screenshot({ path: p }));
await save('store-list', 'Store list', (p) => clipShot(panel.locator('.GlobalStateList'), p));
await save('logs-list', 'Logs list', (p) => clipShot(panel.locator('.LogsPerActionList'), p));
await save('state-changes', 'State changes for the selected log', (p) =>
  clipShot(panel.locator('.StateDiffPerAction'), p),
);

// ------------------------------------------------ time logs display
await panel.getByText('time logs', { exact: true }).click();
await sleep(400);
await save('time-logs', 'Logs in time order', async (p) => clipShot(await rightArea(), p));
await panel.getByText('groups', { exact: true }).first().click();
await sleep(300);

// ------------------------------------------------ restore dialog (cancelled: the state is not changed)
const row = panel.locator('[data-testid=action-log-item]').nth(1);
await row.hover();
await row.getByRole('button', { name: 'Log actions' }).click();
await panel.getByRole('menuitem', { name: 'Restore state' }).click();
await panel.getByRole('dialog').waitFor();
await sleep(300);
await save('restore-dialog', 'Restore confirmation', (p) => clipShot(panel.getByRole('dialog'), p));
await panel.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
await until(async () => (await counterValue()) === '13', 'counter unchanged after cancel');

// ------------------------------------------------ state tab
await panel.locator('[data-testid=tab-state]').click();
await until(async () => /Current State/.test(await panelText()), 'State tab visible');
await sleep(400);
await save('state-tab', 'State tab', async (p) => clipShot(await rightArea(), p));

// ------------------------------------------------ actions of the todos store
await todosCard.getByPlaceholder('new todo').fill('Write the docs');
await todosCard.getByRole('button', { name: 'add', exact: true }).click();
await until(async () => (await todosCard.getByText('Write the docs').count()) > 0, 'todo added');
await selectStore('todos');
await until(async () => /\badd\b/.test(await panelText()), 'add action listed');
await panel
  .locator('[data-testid=action-log-item]', { hasText: 'add' })
  .first()
  .locator('button')
  .first()
  .click();
await sleep(400);
await save('action-groups', 'Actions grouped by name', async (p) => clipShot(await rightArea(), p));

await panel.locator('[data-testid=tab-actions]').click();
await sleep(600);
await save('actions-tab', 'Actions tab', async (p) => clipShot(await rightArea(), p));

// ------------------------------------------------ metadata
const commit = (() => {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root }).toString().trim();
  } catch {
    return 'unknown';
  }
})();
const libraryVersion = JSON.parse(
  fs.readFileSync(path.resolve(root, '../../libs/universal/package.json'), 'utf8'),
).version;

fs.mkdirSync(path.dirname(dataFile), { recursive: true });
fs.writeFileSync(
  dataFile,
  JSON.stringify(
    { capturedWith: { libraryVersion, commit, chrome: browser.version(), theme: 'light' }, shots },
    null,
    2,
  ) + '\n',
);
console.log(`[showcase] ${shots.length} images written`);
await browser.close();
