import { expect, test, type Page } from '@playwright/test';

async function open(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'load' });
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
}

test.describe('site chrome', () => {
  test('search dialog with results', async ({ page }) => {
    await open(page, 'docs/');
    await page.locator('.search-open').click();

    const dialog = page.locator('.search-dialog');
    await dialog.locator('input[type="text"]').fill('selector');
    await dialog.locator('.pagefind-ui__result').first().waitFor();

    await expect(dialog).toHaveScreenshot('search-dialog.png');
  });

  test('install command on a non-default package manager', async ({ page }) => {
    await open(page, '');
    const install = page.locator('.install').first();
    await install.getByRole('tab', { name: 'pnpm' }).click();

    await expect(install).toHaveScreenshot('install-pnpm.png');
  });

  test('mini-me hidden', async ({ page }) => {
    await open(page, '');
    await page.getByRole('button', { name: 'Hide' }).click();

    await expect(page.locator('.site-footer')).toHaveScreenshot('footer-minime-hidden.png');
  });

  test('hero videos on the second tab', async ({ page }) => {
    await open(page, '');
    const hero = page.locator('.hero-videos');
    await hero.getByRole('tab').nth(1).click();

    await expect(hero).toHaveScreenshot('hero-second-tab.png', { mask: [page.locator('video')] });
  });
});

test.describe('example demos', () => {
  test('async demo loaded', async ({ page }) => {
    await open(page, 'examples/async-workflows/');
    const demo = page.locator('.demo').first();
    await demo.getByRole('button', { name: 'Load users' }).click();
    await expect(demo.getByRole('status')).toContainText('Loaded');

    await expect(demo).toHaveScreenshot('async-loaded.png');
  });

  test('async demo failed', async ({ page }) => {
    await open(page, 'examples/async-workflows/');
    const demo = page.locator('.demo').first();
    await demo.getByRole('checkbox', { name: 'Simulate a failing server' }).check();
    await demo.getByRole('button', { name: 'Load users' }).click();
    await expect(demo.getByRole('status')).toContainText('Failed');

    await expect(demo).toHaveScreenshot('async-failed.png');
  });

  test('preferences demo changed', async ({ page }) => {
    await open(page, 'examples/persisted-preferences/');
    const demo = page.locator('.demo').first();
    await demo.getByRole('radio', { name: 'sky' }).check();
    await demo.getByRole('radio', { name: 'large' }).check();
    await demo.getByRole('checkbox', { name: 'Compact layout' }).check();
    await demo.getByLabel('Draft note (not saved)').fill('Visual baseline');

    await expect(demo).toHaveScreenshot('preferences-changed.png');
  });

  test('tasks demo with a completed task', async ({ page }) => {
    await open(page, 'examples/derived-state-and-selectors/');
    const demo = page.locator('.demo').first();
    await demo.getByLabel('New task').fill('Write the visual baseline');
    await demo.getByRole('button', { name: 'Add task' }).click();
    await demo.getByRole('checkbox').first().check();

    await expect(demo).toHaveScreenshot('tasks-completed.png');
  });

  test('tasks demo with an empty filter', async ({ page }) => {
    await open(page, 'examples/derived-state-and-selectors/');
    const demo = page.locator('.demo').first();
    await demo.getByRole('radio', { name: 'done' }).check();

    await expect(demo).toHaveScreenshot('tasks-empty-filter.png');
  });

  test('scoped demo with a third note', async ({ page }) => {
    await open(page, 'examples/scoped-state-with-context/');
    const demo = page.locator('.demo').first();
    await demo.getByRole('button', { name: 'Add a note' }).click();

    await expect(demo).toHaveScreenshot('scoped-third-note.png');
  });

  test('selective demo after an update', async ({ page }) => {
    await open(page, 'examples/shared-state-and-selective-subscriptions/');
    const demo = page.locator('.demo').first();
    await demo.getByRole('button', { name: /Clicked \d+ times/ }).click();

    await expect(demo).toHaveScreenshot('selective-updated.png');
  });
});
