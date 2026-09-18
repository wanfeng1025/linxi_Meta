import { canonicalJson } from '@/shared/data/canonical-json';

import type { HashProvider, SqlDatabase, SqlExecutor } from './types';

interface QuarantineRow {
  readonly legacy_table: string;
  readonly legacy_row_id: string;
  readonly raw_json: string;
}

/** Adds a content-addressed digest after migration 006 has retained ambiguous data. */
export async function hashLegacyProfessionalRuleQuarantine(
  database: SqlDatabase,
  hashProvider: HashProvider,
): Promise<number> {
  const rows = await database.getAll<QuarantineRow>(
    `SELECT legacy_table, legacy_row_id, raw_json
     FROM legacy_professional_rule_quarantine
     WHERE row_sha256 IS NULL`,
  );
  if (rows.length === 0) return 0;

  await database.transaction(async (transaction) => {
    for (const row of rows) {
      const raw = JSON.parse(row.raw_json) as unknown;
      const digest = await hashProvider.sha256(canonicalJson(raw));
      await updateDigest(transaction, row, digest);
    }
  });
  return rows.length;
}

async function updateDigest(
  transaction: SqlExecutor,
  row: QuarantineRow,
  digest: string,
): Promise<void> {
  await transaction.run(
    `UPDATE legacy_professional_rule_quarantine
     SET row_sha256 = ?
     WHERE legacy_table = ? AND legacy_row_id = ? AND row_sha256 IS NULL`,
    [digest, row.legacy_table, row.legacy_row_id],
  );
  await transaction.run(
    `UPDATE legacy_migration_reviews
     SET row_sha256 = ?
     WHERE legacy_table = ? AND legacy_row_id = ? AND row_sha256 IS NULL`,
    [digest, row.legacy_table, row.legacy_row_id],
  );
}
