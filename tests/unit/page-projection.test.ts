import { describe, expect, it } from 'vitest';

import {
  createCastScreenProjection,
  filterHistory,
  type HistoryItem,
} from '../../src/application/page';
import {
  CASTING_INPUT_SCHEMA_VERSION,
  CASTING_RULESET_VERSION,
  castNextLine,
  createCastingSession,
} from '../../src/domain/casting';

function session() {
  let current = createCastingSession({
    sessionId: 'projection-session',
    method: 'tap',
    inputSchemaVersion: CASTING_INPUT_SCHEMA_VERSION,
    rulesetVersion: CASTING_RULESET_VERSION,
    randomAlgorithmVersion: 'fixture-random-v1',
    createdAt: '2026-07-20T00:00:00.000Z',
  });
  current = castNextLine(current, [2, 2, 2], '2026-07-20T00:00:01.000Z');
  current = castNextLine(current, [3, 3, 3], '2026-07-20T00:00:02.000Z');
  return current;
}

describe('page projections', () => {
  it('renders a reversed copy without mutating bottom-up domain order', () => {
    const value = session();
    const projection = createCastScreenProjection(value);
    expect(value.lines.map((line) => line.position)).toEqual([1, 2]);
    expect(projection.topDownLines.map((line) => line.position)).toEqual([2, 1]);
    expect(projection.nextPosition).toBe(3);
    expect(projection.progressLabel).toContain('3 爻');
  });

  it('filters history by query, category, date, and favorite state', () => {
    const items: readonly HistoryItem[] = [
      {
        sessionId: 'a',
        question: '项目节奏',
        category: 'career',
        castAt: '2026-07-20T00:00:00Z',
        primaryName: '乾',
        changedName: '坤',
        movingLineCount: 1,
        favorite: true,
        snapshotCount: 2,
      },
      {
        sessionId: 'b',
        question: '学习计划',
        category: 'study',
        castAt: '2025-07-20T00:00:00Z',
        primaryName: '屯',
        changedName: '蒙',
        movingLineCount: 2,
        favorite: false,
        snapshotCount: 1,
      },
    ];
    expect(
      filterHistory(items, {
        query: '乾',
        category: 'career',
        favoritesOnly: true,
        since: '2026-01-01T00:00:00Z',
      }).map((item) => item.sessionId),
    ).toEqual(['a']);
    expect(
      filterHistory(items, { query: '', category: 'study', favoritesOnly: false, since: null }).map(
        (item) => item.sessionId,
      ),
    ).toEqual(['b']);
  });
});
