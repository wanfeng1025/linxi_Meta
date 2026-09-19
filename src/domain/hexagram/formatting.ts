import type { HexagramDefinition } from './types';

/**
 * A stable, source-backed label for a hexagram. The catalog's canonical name
 * is intentionally preserved; this helper only adds the verified King Wen
 * sequence so Web and mobile do not format the same record differently.
 */
export function formatHexagramLabel(
  hexagram: Pick<HexagramDefinition, 'kingWenSequence' | 'name'>,
): string {
  return `第${hexagram.kingWenSequence}卦 · ${hexagram.name}`;
}
