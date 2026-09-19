import type { LinePosition } from './types';

const LINE_POSITION_LABELS: Readonly<Record<LinePosition, string>> = Object.freeze({
  1: '初爻',
  2: '二爻',
  3: '三爻',
  4: '四爻',
  5: '五爻',
  6: '上爻',
});

export function formatLinePosition(position: LinePosition): string {
  return LINE_POSITION_LABELS[position];
}

export function formatMovingLinePositions(positions: readonly LinePosition[]): string {
  return positions.map(formatLinePosition).join('、');
}
