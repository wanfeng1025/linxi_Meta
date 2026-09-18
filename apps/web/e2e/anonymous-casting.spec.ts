import { expect, test } from '@playwright/test';

test('anonymous visitor can lock a six-line casting and inspect verified structures', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('link', { name: '开始匿名起卦' }).click();
  await expect(page.getByText('让问题更容易回看（可选）')).toBeVisible();
  await page.getByLabel('问题仅保存在当前浏览器会话').fill('测试会话不会上传');
  await page.getByRole('button', { name: '开始起卦' }).click();

  for (let line = 0; line < 6; line += 1) {
    await page.getByRole('button', { name: '起下一爻' }).click();
  }

  await expect(page.getByText('6 / 6 爻')).toBeVisible();
  await page.getByRole('button', { name: '锁定并查看结构结果' }).click();
  await expect(page.getByText('已锁定的结构结果')).toBeVisible();
  await expect(page.getByText('本次问题')).toBeVisible();
  await expect(page.getByText('本次起卦原始记录')).toBeVisible();
  await expect(page.getByRole('heading', { name: '古籍原文引用' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '白话释义' })).toBeVisible();
  await expect(page.getByText('不是自动解卦、吉凶判断或现实决策建议。')).toBeVisible();
  await expect(page.getByRole('link', { name: '浏览本卦结构' })).toBeVisible();
  await expect(page.getByText('自动解卦、AI 和专业六爻规则尚未发布。')).toBeVisible();

  await page.reload();
  await expect(page.getByText('已锁定的结构结果')).toBeVisible();

  await page.goto('/hexagrams');
  await expect(page.getByRole('heading', { name: '六十四卦' })).toBeVisible();
  await expect(page.locator('.catalog a')).toHaveCount(64);

  await page.goto('/methodology');
  await expect(page.getByRole('heading', { name: '方法与证据' })).toBeVisible();
  await expect(page.getByText('未发布功能的启用条件')).toBeVisible();
  await expect(page.getByText('专业六爻排盘')).toBeVisible();
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
