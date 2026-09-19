import { getCastingProgress, type CastingSession } from '@/domain/casting';

import type { CastScreenProjection, HistoryItem, QuestionCategory } from './types';

export function createCastScreenProjection(session: CastingSession): CastScreenProjection {
  const progress = getCastingProgress(session);
  return {
    session,
    topDownLines: Object.freeze([...session.lines].reverse()),
    nextPosition: progress.nextPosition,
    progressLabel: progress.isComplete
      ? session.status === 'locked'
        ? '六爻已锁定'
        : '六爻已完成，等待锁定'
      : `已完成 ${progress.castCount} / 6 · 下一次为第 ${progress.nextPosition ?? 6} 爻`,
    locked: progress.isLocked,
  };
}

export interface HistoryFilter {
  readonly query: string;
  readonly category: QuestionCategory | 'all';
  readonly favoritesOnly: boolean;
  readonly since: string | null;
}

export function filterHistory(
  items: readonly HistoryItem[],
  filter: HistoryFilter,
): readonly HistoryItem[] {
  const query = filter.query.trim().toLocaleLowerCase('zh-Hans');
  const since = filter.since === null ? null : Date.parse(filter.since);
  return items.filter((item) => {
    if (filter.category !== 'all' && item.category !== filter.category) return false;
    if (filter.favoritesOnly && !item.favorite) return false;
    if (since !== null && Date.parse(item.castAt) < since) return false;
    if (query.length === 0) return true;
    return `${item.question} ${item.primaryName} ${item.changedName ?? ''}`
      .toLocaleLowerCase('zh-Hans')
      .includes(query);
  });
}
