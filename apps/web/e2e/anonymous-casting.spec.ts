import { expect, test } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';

test('anonymous visitor can lock a six-line casting and inspect verified structures', async ({
  page,
}) => {
  test.setTimeout(60_000);
  const runtimeErrors: string[] = [];
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      message.text().includes('Content-Security-Policy') &&
      message.text().includes('blocked a JavaScript eval') &&
      message.text().includes("Missing 'unsafe-eval'")
    ) {
      return;
    }
    if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.message}`));
  page.on('requestfailed', (request) => {
    if (
      request.failure()?.errorText === 'net::ERR_ABORTED' &&
      (request.url().includes('?_rsc=') || request.url().includes('/_next/static/'))
    ) {
      return;
    }
    if (['document', 'script', 'stylesheet', 'xhr', 'fetch'].includes(request.resourceType())) {
      runtimeErrors.push(`request: ${request.url()} — ${request.failure()?.errorText ?? 'failed'}`);
    }
  });

  await page.goto('/', { waitUntil: 'networkidle' });
  await Promise.all([
    page.waitForURL('**/casting'),
    page.getByRole('link', { name: '开始匿名起卦' }).click(),
  ]);
  await expect(page.getByText('问题仅保存在本次浏览器会话。')).toBeVisible();
  await expect(page.getByText('起卦的范围')).toHaveCount(0);
  await page.getByLabel('问题仅保存在当前浏览器会话').fill('测试会话不会上传');
  await page.getByRole('button', { name: '开始起卦' }).click();

  for (let line = 0; line < 6; line += 1) {
    await page.getByRole('button', { name: '起下一爻' }).click();
  }

  await expect(page.getByText('6 / 6 爻')).toBeVisible();
  await expect(page.getByRole('heading', { name: '六爻已成，等待锁定' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /第 7 爻/ })).toHaveCount(0);
  await Promise.all([
    page.waitForURL('**/result/**'),
    page.getByRole('button', { name: '锁定并查看结构结果' }).click(),
  ]);
  await expect(page.getByText('已锁定的结构结果')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('heading', { name: '本次问题', exact: true })).toBeVisible();
  await expect(page.getByText('本次起卦原始记录')).toBeVisible();
  await expect(page.getByRole('heading', { name: '原文与解释' })).toBeVisible();
  await expect(
    page.getByText('原文保持核验版本，白话解释只用于学习参考，不生成针对本次问题的结论。'),
  ).toBeVisible();
  await expect(page.getByText(/定位：/)).toHaveCount(0);
  await expect(page.getByRole('link', { name: '浏览本卦结构' })).toBeVisible();
  await expect(page.getByText('功能状态')).toHaveCount(0);
  await expect(page.getByLabel(/导出时包含我填写的问题/)).not.toBeChecked();
  await expect(page.getByText(/trigram-/)).toHaveCount(0);

  const jsonDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出 JSON' }).click();
  const downloadedJson = await jsonDownload;
  await expect(downloadedJson.suggestedFilename()).toMatch(/lingxi-meta-.+\.json/);
  const jsonPath = await downloadedJson.path();
  expect(jsonPath).not.toBeNull();
  const exported = JSON.parse(await readFile(jsonPath!, 'utf8')) as {
    privacy: { questionIncluded: boolean };
    question?: string;
    session: { lines: unknown[] };
  };
  expect(exported.privacy.questionIncluded).toBe(false);
  expect(exported.question).toBeUndefined();
  expect(exported.session.lines).toHaveLength(6);

  const pngDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出 PNG' }).click();
  await expect((await pngDownload).suggestedFilename()).toMatch(/lingxi-meta-.+\.png/);

  await page.reload();
  await expect(page.getByText('已锁定的结构结果')).toBeVisible();

  await page.goto('/hexagrams');
  await expect(page.getByRole('heading', { name: '六十四卦' })).toBeVisible();
  await expect(page.locator('.catalog a')).toHaveCount(64);

  await page.goto('/methodology');
  await expect(page.getByRole('heading', { name: '方法与证据' })).toBeVisible();
  await expect(page.getByText('未发布功能的启用条件')).toBeVisible();
  await expect(page.getByText('专业六爻排盘')).toBeVisible();
  expect(runtimeErrors, runtimeErrors.join('\n')).toEqual([]);
});

test('critical public pages have no automatically detectable accessibility violations', async ({
  page,
}) => {
  test.setTimeout(60_000);
  for (const path of ['/', '/casting', '/hexagrams', '/methodology']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    const report = await new AxeBuilder({ page }).analyze();
    expect(report.violations, `${path}: ${JSON.stringify(report.violations, null, 2)}`).toEqual([]);
  }
});

test('reduced motion keeps the casting flow operable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/casting');
  await page.getByRole('button', { name: '开始起卦' }).click();
  await page.getByRole('button', { name: '起下一爻' }).click();
  await expect(page.getByText('1 / 6 爻')).toBeVisible();
});

test('mobile navigation exposes an accessible menu and returns focus on Escape', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const toggle = page.getByRole('button', { name: '打开菜单' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(page.getByRole('button', { name: '关闭菜单' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(page.getByRole('link', { name: '方法与证据', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '打开菜单' })).toBeFocused();
});

test('hexagram directory supports search and upper/lower trigram filters', async ({ page }) => {
  await page.goto('/hexagrams');
  await expect(page.getByText('显示 64 / 64 卦')).toBeVisible();
  await page.getByLabel('搜索卦名、编号或卦象').fill('乾');
  await expect(page.getByText(/显示 \d+ \/ 64 卦/)).toBeVisible();
  await page.getByLabel('搜索卦名、编号或卦象').fill('');
  await page.getByLabel('上卦').selectOption({ label: '乾' });
  await expect(page.getByText(/显示 8 \/ 64 卦/)).toBeVisible();
  await page.getByLabel('下卦').selectOption({ label: '乾' });
  await expect(page.getByText(/显示 1 \/ 64 卦/)).toBeVisible();
});

test('corrupt session storage falls back to a safe empty state', async ({ page }) => {
  await page.goto('/casting');
  await page.evaluate(() => {
    sessionStorage.setItem('liuyao:web:active-session-id', 'broken');
    sessionStorage.setItem('liuyao:web:session:broken', '{not json');
  });
  await page.reload();

  await expect(page.getByRole('heading', { name: '写下你的问题（可选）' })).toBeVisible();
});

test('keyboard activation works and clearing a result removes the local session', async ({
  page,
}) => {
  await page.goto('/casting');
  const begin = page.getByRole('button', { name: '开始起卦' });
  await begin.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('0 / 6 爻')).toBeVisible();

  for (let line = 0; line < 6; line += 1) {
    const cast = page.getByRole('button', { name: '起下一爻' });
    await cast.focus();
    await page.keyboard.press('Enter');
  }

  await page.getByRole('button', { name: '锁定并查看结构结果' }).click();
  await page.getByRole('button', { name: '清除本次会话' }).click();
  await expect(page.getByRole('alertdialog')).toContainText('只会删除当前浏览器会话');
  await page.getByRole('button', { name: '确认清除' }).click();
  await expect(page).toHaveURL(/\/casting$/);
  await expect(page.getByRole('heading', { name: '写下你的问题（可选）' })).toBeVisible();
});
