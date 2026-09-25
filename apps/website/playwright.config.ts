import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.VISUAL_PORT ?? 4330);
const BASE = '/react-global-state-hooks/';

/**
 * Visual regression baselines for the whole site. Local only: no CI job runs `test:visual`, and the
 * baselines are macOS-rendered. See visual/README.md.
 */
export default defineConfig({
  testDir: './visual',
  snapshotDir: './visual/__screenshots__',
  snapshotPathTemplate: '{snapshotDir}/{arg}-{projectName}{ext}',
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.03, animations: 'disabled', caret: 'hide', scale: 'css' },
  },
  use: {
    baseURL: `http://127.0.0.1:${PORT}${BASE}`,
    reducedMotion: 'reduce',
    colorScheme: 'light',
    locale: 'en-US',
    timezoneId: 'UTC',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: `node scripts/visual-server.mjs ${PORT}`,
    url: `http://127.0.0.1:${PORT}${BASE}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
