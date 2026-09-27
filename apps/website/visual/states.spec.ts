import { expect, test, type Page } from '@playwright/test';

async function open(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'load' });
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
}

test.describe('site chrome', () => {
  test('search dialog with results', async ({ page }) => {
    await open(page, 'docs/');
    await page.getByRole('button', { name: 'Search documentation' }).click();

    const dialog = page.locator('dialog[open]');
    await dialog.locator('input').fill('selector');
    await dialog.locator('a[data-result]').first().waitFor();

    await expect(dialog).toHaveScreenshot('search-dialog.png');
  });

  test('search dialog with no results', async ({ page }) => {
    await open(page, 'docs/');
    await page.getByRole('button', { name: 'Search documentation' }).click();

    const dialog = page.locator('dialog[open]');
    await dialog.locator('input').fill('zzzzqqq');
    await dialog.getByText('No results for').waitFor();

    await expect(dialog).toHaveScreenshot('search-empty.png');
  });

  test('install command on a non-default package manager', async ({ page }) => {
    await open(page, 'docs/getting-started/');
    const install = page.locator('.install').first();
    await install.getByRole('tab', { name: 'pnpm' }).click();

    await expect(install).toHaveScreenshot('install-pnpm.png');
  });

  test('copy feedback', async ({ page }) => {
    await open(page, 'docs/getting-started/');
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.locator('.copy-button').first().click();

    await expect(page.locator('.toast')).toHaveText('Install command copied.');
  });

  test('mobile navigation drawer', async ({ page, isMobile, viewport }) => {
    test.skip(!isMobile && (viewport?.width ?? 0) > 760, 'desktop has no drawer');
    await open(page, 'docs/getting-started/');
    await page.getByRole('button', { name: 'Open navigation' }).click();

    await expect(page.locator('dialog[open]')).toHaveScreenshot('navigation-drawer.png');
  });

  test('mobile documentation drawer', async ({ page, isMobile, viewport }) => {
    test.skip(!isMobile && (viewport?.width ?? 0) > 760, 'desktop has no drawer');
    await open(page, 'docs/getting-started/');
    await page.getByRole('button', { name: 'Browse docs' }).click();

    await expect(page.locator('dialog[open]')).toHaveScreenshot('docs-drawer.png');
  });
});

test.describe('home sequences', () => {
  test('hero on the third chapter', async ({ page }) => {
    await open(page, '');
    await page.getByRole('tab', { name: /Debug with evidence/ }).click();

    await expect(page.locator('#demo')).toHaveScreenshot('hero-chapter-3.png');
  });

  test('agent workflow on the verify step', async ({ page }) => {
    await open(page, '');
    await page.getByRole('tab', { name: /Verify the result/ }).click();

    await expect(page.locator('#agentic')).toHaveScreenshot('home-agent-verify.png');
  });

  test('selected values after a name change', async ({ page }) => {
    await open(page, '');
    await page.getByLabel('Profile name').fill('Grace');

    await expect(page.locator('#precision')).toHaveScreenshot('precision-changed.png');
  });
});

test.describe('example workbenches', () => {
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

  test('tasks demo blank validation', async ({ page }) => {
    await open(page, 'examples/derived-state-and-selectors/');
    const demo = page.locator('.demo').first();
    await demo.getByRole('button', { name: 'Add task' }).click();
    await expect(demo.getByRole('alert')).toHaveText('Add a task name first.');

    await expect(demo).toHaveScreenshot('tasks-validation.png');
  });

  test('tasks demo empty filter', async ({ page }) => {
    await open(page, 'examples/derived-state-and-selectors/');
    const demo = page.locator('.demo').first();
    await demo.getByLabel('done').check();
    await demo.getByRole('button', { name: 'Clear done' }).click();

    await expect(demo).toHaveScreenshot('tasks-empty.png');
  });

  test('scoped demo with a third note', async ({ page }) => {
    await open(page, 'examples/scoped-state-with-context/');
    const demo = page.locator('.demo').first();
    await demo.getByRole('button', { name: 'Add a note' }).click();
    await demo.getByRole('region', { name: 'Note 3' }).getByLabel('Body').fill('one two three');

    await expect(demo).toHaveScreenshot('scoped-three-notes.png');
  });

  test('selective demo after an update', async ({ page }) => {
    await open(page, 'examples/shared-state-and-selective-subscriptions/');
    const demo = page.locator('.demo').first();
    await demo.getByRole('textbox', { name: 'Name' }).fill('Grace');
    await demo.getByRole('button', { name: /Clicked 0 times/ }).click();

    await expect(demo).toHaveScreenshot('selective-updated.png');
  });

  test('workbench explanation tab', async ({ page }) => {
    await open(page, 'examples/shared-state-and-selective-subscriptions/');
    await page.getByRole('tab', { name: 'What changes' }).click();

    await expect(page.locator('.workbench')).toHaveScreenshot('workbench-what-changes.png');
  });

  test('gallery empty state', async ({ page }) => {
    await open(page, 'examples/');
    await page.getByRole('button', { name: 'Async', exact: true }).click();
    await page.getByLabel('Find an example').fill('nothing-here');

    await expect(page.locator('#example-cards')).toHaveScreenshot('gallery-empty.png');
  });
});

test.describe('product pages', () => {
  test('agentic devtools on the verify step', async ({ page }) => {
    await open(page, 'agentic-devtools/');
    await page.getByRole('button', { name: 'Verify Read back the result.' }).click();

    await expect(page.getByLabel('Agent workflow demonstration')).toHaveScreenshot('agentic-verify.png');
  });

  test('review pipeline on the report stage', async ({ page }) => {
    await open(page, 'easy-code-review/');
    await page.getByRole('button', { name: /Report/ }).first().click();

    await expect(page.getByRole('group', { name: 'Review pipeline' }).locator('..')).toHaveScreenshot('review-report.png');
  });
});

test.describe('dark appearance', () => {
  const pick = async (page: Page, theme: 'light' | 'dark') => {
    await page.getByRole('button', { name: `Switch to the ${theme} appearance` }).click();
    await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /\bdark\b/ : /^(?!.*\bdark\b)/);
  };

  test('home page in dark', async ({ page }) => {
    await open(page, '');
    await pick(page, 'dark');

    await expect(page).toHaveScreenshot('dark-home.png', { fullPage: true, mask: [page.locator('video')] });
  });

  test('documentation article in dark', async ({ page }) => {
    await open(page, 'docs/getting-started/');
    await pick(page, 'dark');

    await expect(page).toHaveScreenshot('dark-docs.png', { fullPage: true });
  });

  test('example workbench in dark', async ({ page }) => {
    await open(page, 'examples/shared-state-and-selective-subscriptions/');
    await pick(page, 'dark');

    await expect(page.locator('.workbench')).toHaveScreenshot('dark-workbench.png');
  });
});
