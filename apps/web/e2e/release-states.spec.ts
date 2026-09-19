import { expect, test, type Page } from '@playwright/test';

import {
  calculateHexagram,
  castNextLine,
  createCastingSession,
  lockCastingSession,
  type CastingSession,
  type CoinTuple,
  type LineValue,
} from '@liuyao/domain';
import { verifiedHexagramCatalog } from '@liuyao/content';

const COINS_BY_VALUE: Readonly<Record<LineValue, CoinTuple>> = {
  6: [2, 2, 2],
  7: [2, 2, 3],
  8: [2, 3, 3],
  9: [3, 3, 3],
};

const STATIC_QIAN = [7, 7, 7, 7, 7, 7] as const satisfies readonly LineValue[];
const STATIC_JIE = [7, 7, 8, 8, 7, 8] as const satisfies readonly LineValue[];
const SINGLE_MOVING = [9, 7, 7, 7, 7, 7] as const satisfies readonly LineValue[];
const MULTIPLE_MOVING = [6, 9, 7, 8, 6, 9] as const satisfies readonly LineValue[];

function createLockedSession(values: readonly LineValue[], sessionId: string): CastingSession {
  const createdAt = '2026-01-01T00:00:00.000Z';
  let session = createCastingSession({
    sessionId,
    method: 'tap',
    inputSchemaVersion: 'web-input-v1',
    rulesetVersion: 'hexagram-structure-v1',
    randomAlgorithmVersion: 'e2e-fixed-coins-v1',
    createdAt,
  });

  values.forEach((value) => {
    session = castNextLine(
      session,
      COINS_BY_VALUE[value],
      new Date(Date.parse(session.updatedAt) + 1_000).toISOString(),
    );
  });

  return lockCastingSession(session, new Date(Date.parse(session.updatedAt) + 1_000).toISOString());
}

function createSnapshot(values: readonly LineValue[], sessionId: string) {
  const session = createLockedSession(values, sessionId);
  const result = calculateHexagram({
    originalLines: session.lines.map((line) => ({ position: line.position, value: line.value })),
    rulesetVersion: session.rulesetVersion,
    catalog: verifiedHexagramCatalog,
  });
  return {
    schemaVersion: 'web-casting-session-v1',
    question: '',
    session,
    result,
  };
}

async function seedSnapshot(page: Page, sessionId: string, snapshot: unknown): Promise<void> {
  await page.addInitScript(
    ({ sessionId: id, snapshot: value }) => {
      sessionStorage.setItem('liuyao:web:active-session-id', id);
      sessionStorage.setItem(`liuyao:web:session:${id}`, JSON.stringify(value));
    },
    { sessionId, snapshot },
  );
}

function watchRuntimeErrors(page: Page): () => void {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('requestfailed', (request) => {
    if (request.failure()?.errorText === 'net::ERR_ABORTED' && request.url().includes('?_rsc=')) {
      return;
    }
    if (['document', 'script', 'stylesheet', 'xhr', 'fetch'].includes(request.resourceType())) {
      errors.push(`request: ${request.url()} — ${request.failure()?.errorText ?? 'failed'}`);
    }
  });
  return () => expect(errors, errors.join('\n')).toEqual([]);
}

test('乾卦静卦 hides pseudo change result and survives refresh', async ({ page }) => {
  const finishRuntimeCheck = watchRuntimeErrors(page);
  const sessionId = 'e2e-static-qian';
  const snapshot = createSnapshot(STATIC_QIAN, sessionId);
  expect(snapshot.result.changeStatus).toBe('STATIC');
  expect(snapshot.result.changedHexagram).toBeNull();

  await seedSnapshot(page, sessionId, snapshot);
  await page.goto(`/result/${sessionId}`);
  await expect(page.getByRole('heading', { name: '第1卦 · 乾' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '静卦 · 无动爻' })).toBeVisible();
  await expect(page.getByText('本次无动爻，不产生独立变卦。')).toBeVisible();
  await expect(page.getByText('变卦', { exact: true })).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole('heading', { name: '静卦 · 无动爻' })).toBeVisible();
  finishRuntimeCheck();
});

test('水泽节静卦 preserves lower and upper trigram direction', async ({ page }) => {
  const finishRuntimeCheck = watchRuntimeErrors(page);
  const sessionId = 'e2e-static-jie';
  const snapshot = createSnapshot(STATIC_JIE, sessionId);
  expect(snapshot.result.primaryHexagram.name).toBe('节');
  expect(snapshot.result.lowerTrigram.name).toBe('兑');
  expect(snapshot.result.upperTrigram.name).toBe('坎');
  expect(snapshot.result.changeStatus).toBe('STATIC');
  expect(snapshot.result.changedHexagram).toBeNull();

  await seedSnapshot(page, sessionId, snapshot);
  await page.goto(`/result/${sessionId}`);
  await expect(page.getByRole('heading', { name: '第60卦 · 节' })).toBeVisible();
  await expect(page.getByText('下卦 兑 · 上卦 坎')).toBeVisible();
  await expect(page.getByRole('heading', { name: '静卦 · 无动爻' })).toBeVisible();
  finishRuntimeCheck();
});

test('single moving line shows 初爻 and 姤', async ({ page }) => {
  const finishRuntimeCheck = watchRuntimeErrors(page);
  const sessionId = 'e2e-single-moving';
  const snapshot = createSnapshot(SINGLE_MOVING, sessionId);
  expect(snapshot.result.primaryHexagram.name).toBe('乾');
  expect(snapshot.result.changeStatus).toBe('CHANGING');
  expect(snapshot.result.movingLines).toEqual([1]);
  expect(snapshot.result.changedHexagram.name).toBe('姤');

  await seedSnapshot(page, sessionId, snapshot);
  await page.goto(`/result/${sessionId}`);
  await expect(page.getByRole('heading', { name: '第1卦 · 乾' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '第44卦 · 姤' })).toBeVisible();
  await expect(page.getByText('状态：动卦 · 初爻动')).toBeVisible();
  finishRuntimeCheck();
});

test('multiple moving lines all appear with the 既济 change', async ({ page }) => {
  const finishRuntimeCheck = watchRuntimeErrors(page);
  const sessionId = 'e2e-multiple-moving';
  const snapshot = createSnapshot(MULTIPLE_MOVING, sessionId);
  expect(snapshot.result.primaryHexagram.name).toBe('蛊');
  expect(snapshot.result.changeStatus).toBe('CHANGING');
  expect(snapshot.result.movingLines).toEqual([1, 2, 5, 6]);
  expect(snapshot.result.changedHexagram.name).toBe('既济');

  await seedSnapshot(page, sessionId, snapshot);
  await page.goto(`/result/${sessionId}`);
  await expect(page.getByRole('heading', { name: '第18卦 · 蛊' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '第63卦 · 既济' })).toBeVisible();
  await expect(page.getByText('状态：动卦 · 初爻、二爻、五爻、上爻动')).toBeVisible();
  finishRuntimeCheck();
});

test('legacy static snapshot is recalculated without a pseudo changed hexagram', async ({
  page,
}) => {
  const finishRuntimeCheck = watchRuntimeErrors(page);
  const sessionId = 'e2e-legacy-static';
  const current = createSnapshot(STATIC_QIAN, sessionId);
  const { changeStatus: _changeStatus, ...withoutStatus } = current.result;
  const legacySnapshot = {
    ...current,
    schemaVersion: 'web-casting-session-v0',
    result: {
      ...withoutStatus,
      movingLines: [],
      changedHexagram: current.result.primaryHexagram,
    },
  };

  await seedSnapshot(page, sessionId, legacySnapshot);
  await page.goto(`/result/${sessionId}`);
  await expect(page.getByRole('heading', { name: '静卦 · 无动爻' })).toBeVisible();
  await expect(page.getByText('本次无动爻，不产生独立变卦。')).toBeVisible();
  await expect(page.getByText('变卦', { exact: true })).toHaveCount(0);
  finishRuntimeCheck();
});

test('corrupt locked session shows a safe recovery state', async ({ page }) => {
  const finishRuntimeCheck = watchRuntimeErrors(page);
  const sessionId = 'e2e-corrupt-session';
  const snapshot = createSnapshot(STATIC_QIAN, sessionId);
  const corrupt = JSON.parse(JSON.stringify(snapshot)) as {
    session: { lines: { coins: number[] }[] };
  };
  corrupt.session.lines[0]!.coins = [1, 1, 1];

  await seedSnapshot(page, sessionId, corrupt);
  await page.goto(`/result/${sessionId}`);
  await expect(page.getByRole('heading', { name: '找不到本次结果' })).toBeVisible();
  await expect(page.getByRole('link', { name: '重新开始' })).toBeVisible();
  await expect(page.getByText(/stack|C:\\Users|node_modules|Error:/i)).toHaveCount(0);
  finishRuntimeCheck();
});

test('static result remains usable at the 390px mobile viewport', async ({ page }) => {
  const finishRuntimeCheck = watchRuntimeErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const sessionId = 'e2e-mobile-static';
  await seedSnapshot(page, sessionId, createSnapshot(STATIC_JIE, sessionId));
  await page.goto(`/result/${sessionId}`);

  await expect(page.getByRole('heading', { name: '静卦 · 无动爻' })).toBeVisible();
  await expect(page.getByText('本次无动爻，不产生独立变卦。')).toBeVisible();
  await expect(page.getByRole('link', { name: '开始新的起卦' })).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  finishRuntimeCheck();
});
