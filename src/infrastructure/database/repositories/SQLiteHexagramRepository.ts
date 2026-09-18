import type {
  ContentTextDto,
  HexagramDto,
  HexagramLineDto,
  HexagramRepository,
  SpecialLineTextDto,
} from '@/application/repositories';
import type { LinePosition } from '@/domain/casting';

import type { SqlDatabase } from '../types';

interface HexagramRow {
  readonly hexagram_id: string;
  readonly content_version: string;
  readonly king_wen_sequence: number;
  readonly name: string;
  readonly upper_trigram_id: string;
  readonly lower_trigram_id: string;
  readonly code: string;
  readonly classical_text: string | null;
  readonly modern_text: string | null;
}

interface LineRow {
  readonly line_id: string;
  readonly line_position: number;
  readonly classical_text: string | null;
  readonly modern_text: string | null;
}

interface SpecialLineRow {
  readonly special_line_id: string;
  readonly kind: 'use-nine' | 'use-six';
  readonly classical_text: string | null;
  readonly modern_text: string | null;
}

interface TextRow {
  readonly text_id: string;
  readonly owner_id: string;
  readonly text_type: string;
  readonly text_class: string;
  readonly locale: string;
  readonly text_value: string;
}

function asText(row: TextRow): ContentTextDto {
  return {
    id: row.text_id,
    textType: row.text_type,
    textClass: row.text_class,
    locale: row.locale,
    text: row.text_value,
  };
}

function groupTexts(rows: readonly TextRow[]): ReadonlyMap<string, readonly ContentTextDto[]> {
  const grouped = new Map<string, ContentTextDto[]>();
  for (const row of rows) {
    grouped.set(row.owner_id, [...(grouped.get(row.owner_id) ?? []), asText(row)]);
  }
  return grouped;
}

function asLinePosition(value: number): LinePosition {
  if (!Number.isInteger(value) || value < 1 || value > 6) {
    throw new Error(`Stored line position ${value} is invalid.`);
  }
  return value as LinePosition;
}

export class SQLiteHexagramRepository implements HexagramRepository {
  public constructor(private readonly database: SqlDatabase) {}

  public async getById(hexagramId: string, contentVersion: string): Promise<HexagramDto | null> {
    const row = await this.database.getFirst<HexagramRow>(
      `SELECT hexagram_id, content_version, king_wen_sequence, name, upper_trigram_id,
              lower_trigram_id, code, classical_text, modern_text
       FROM hexagrams
       WHERE hexagram_id = ? AND content_version = ?`,
      [hexagramId, contentVersion],
    );
    return row === null ? null : this.hydrate(row);
  }

  public async getByCombination(
    upperTrigramId: string,
    lowerTrigramId: string,
    contentVersion: string,
  ): Promise<HexagramDto | null> {
    const row = await this.database.getFirst<HexagramRow>(
      `SELECT hexagram_id, content_version, king_wen_sequence, name, upper_trigram_id,
              lower_trigram_id, code, classical_text, modern_text
       FROM hexagrams
       WHERE upper_trigram_id = ? AND lower_trigram_id = ? AND content_version = ?`,
      [upperTrigramId, lowerTrigramId, contentVersion],
    );
    return row === null ? null : this.hydrate(row);
  }

  private async hydrate(row: HexagramRow): Promise<HexagramDto> {
    const [lineRows, specialRows, textRows] = await Promise.all([
      this.database.getAll<LineRow>(
        `SELECT line_id, line_position, classical_text, modern_text
         FROM hexagram_lines
         WHERE hexagram_id = ? AND content_version = ?
         ORDER BY line_position`,
        [row.hexagram_id, row.content_version],
      ),
      this.database.getAll<SpecialLineRow>(
        `SELECT special_line_id, kind, classical_text, modern_text
         FROM special_line_texts
         WHERE hexagram_id = ? AND content_version = ?
         ORDER BY kind`,
        [row.hexagram_id, row.content_version],
      ),
      this.database.getAll<TextRow>(
        `SELECT text_id, owner_id, text_type, text_class, locale, text_value
         FROM content_texts
         WHERE content_version = ? AND (
           (owner_type = 'hexagram' AND owner_id = ?) OR
           (owner_type = 'hexagram-line' AND owner_id IN (
             SELECT line_id FROM hexagram_lines
             WHERE hexagram_id = ? AND content_version = ?
           )) OR
           (owner_type = 'special-line' AND owner_id IN (
             SELECT special_line_id FROM special_line_texts
             WHERE hexagram_id = ? AND content_version = ?
           ))
         )
         ORDER BY owner_type, owner_id, text_type, locale`,
        [
          row.content_version,
          row.hexagram_id,
          row.hexagram_id,
          row.content_version,
          row.hexagram_id,
          row.content_version,
        ],
      ),
    ]);
    const textsByOwner = groupTexts(textRows);
    const lines: readonly HexagramLineDto[] = lineRows.map((line) => ({
      id: line.line_id,
      position: asLinePosition(line.line_position),
      classicalText: line.classical_text,
      modernText: line.modern_text,
      texts: textsByOwner.get(line.line_id) ?? [],
    }));
    const specialLineTexts: readonly SpecialLineTextDto[] = specialRows.map((line) => ({
      id: line.special_line_id,
      kind: line.kind,
      classicalText: line.classical_text,
      modernText: line.modern_text,
      texts: textsByOwner.get(line.special_line_id) ?? [],
    }));
    return {
      id: row.hexagram_id,
      contentVersion: row.content_version,
      kingWenSequence: row.king_wen_sequence,
      name: row.name,
      upperTrigramId: row.upper_trigram_id,
      lowerTrigramId: row.lower_trigram_id,
      code: row.code,
      classicalText: row.classical_text,
      modernText: row.modern_text,
      texts: textsByOwner.get(row.hexagram_id) ?? [],
      lines,
      specialLineTexts,
    };
  }
}
