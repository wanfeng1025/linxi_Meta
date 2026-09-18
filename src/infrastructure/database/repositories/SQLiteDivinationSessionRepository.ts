import type {
  AnalysisSnapshotDto,
  DivinationSessionRecordDto,
  DivinationSessionRepository,
  StoredCastLineDto,
} from '@/application/repositories';
import type { CoinTuple, LinePosition, LineValue } from '@/domain/casting';
import { canonicalJson } from '@/shared/data/canonical-json';

import type { HashProvider, SqlDatabase, SqlExecutor } from '../types';

interface SessionRow {
  readonly session_id: string;
  readonly question: string | null;
  readonly category_id: string | null;
  readonly cast_at: string;
  readonly timezone: string;
  readonly app_version: string | null;
  readonly database_schema_version: string | null;
  readonly cast_algorithm_version: string | null;
  readonly calendar_algorithm_version: string | null;
  readonly template_version: string | null;
  readonly ai_prompt_version: string | null;
  readonly calendar_snapshot_json: string | null;
  readonly input_schema_version: string;
  readonly divination_ruleset_version: string;
  readonly interpretation_ruleset_version: string;
  readonly random_algorithm_version: string;
  readonly content_version: string;
  readonly primary_hexagram_id: string;
  readonly changed_hexagram_id: string;
  readonly created_at: string;
}

interface LineRow {
  readonly line_position: number;
  readonly coin_1: number;
  readonly coin_2: number;
  readonly coin_3: number;
  readonly line_value: number;
  readonly primary_bit: number;
  readonly changed_bit: number;
  readonly is_moving: number;
}

interface SnapshotRow {
  readonly snapshot_id: string;
  readonly schema_version: string;
  readonly ruleset_version: string;
  readonly content_version: string;
  readonly template_version: string | null;
  readonly calendar_algorithm_version: string | null;
  readonly ai_prompt_version: string | null;
  readonly reanalysis_of_snapshot_id: string | null;
  readonly payload_json: string;
  readonly created_at: string;
}

interface SessionVersionRow {
  readonly content_version: string;
}

interface HexagramCodeRow {
  readonly code: string;
}

interface SessionIdRow {
  readonly session_id: string;
}

export class DivinationRepositoryError extends Error {
  public constructor(
    public readonly code:
      'INVALID_HISTORY_RECORD' | 'SESSION_NOT_FOUND' | 'SNAPSHOT_VERSION_MISMATCH',
    message: string,
  ) {
    super(message);
    this.name = 'DivinationRepositoryError';
  }
}

function isImmutableVersion(value: string): boolean {
  return value.length > 0 && value !== 'latest';
}

function isOptionalImmutableVersion(value: string | null): boolean {
  return value === null || isImmutableVersion(value);
}

function expectedLine(value: LineValue): Omit<StoredCastLineDto, 'position' | 'coins' | 'value'> {
  switch (value) {
    case 6:
      return { primaryBit: 0, changedBit: 1, isMoving: true };
    case 7:
      return { primaryBit: 1, changedBit: 1, isMoving: false };
    case 8:
      return { primaryBit: 0, changedBit: 0, isMoving: false };
    case 9:
      return { primaryBit: 1, changedBit: 0, isMoving: true };
  }
}

function assertLine(line: StoredCastLineDto, expectedPosition: number): void {
  const sum = line.coins[0] + line.coins[1] + line.coins[2];
  const derived = expectedLine(line.value);
  if (
    line.position !== expectedPosition ||
    line.coins.some((coin) => coin !== 2 && coin !== 3) ||
    sum !== line.value ||
    line.primaryBit !== derived.primaryBit ||
    line.changedBit !== derived.changedBit ||
    line.isMoving !== derived.isMoving
  ) {
    throw new DivinationRepositoryError(
      'INVALID_HISTORY_RECORD',
      `Cast line ${expectedPosition} does not preserve valid raw coin facts.`,
    );
  }
}

function assertSnapshot(snapshot: AnalysisSnapshotDto, contentVersion: string): void {
  if (
    snapshot.contentVersion !== contentVersion ||
    !isImmutableVersion(snapshot.schemaVersion) ||
    !isImmutableVersion(snapshot.rulesetVersion) ||
    !isImmutableVersion(snapshot.contentVersion) ||
    !isOptionalImmutableVersion(snapshot.templateVersion) ||
    !isOptionalImmutableVersion(snapshot.calendarAlgorithmVersion) ||
    !isOptionalImmutableVersion(snapshot.aiPromptVersion)
  ) {
    throw new DivinationRepositoryError(
      'SNAPSHOT_VERSION_MISMATCH',
      `Snapshot ${snapshot.snapshotId} does not match the session's immutable versions.`,
    );
  }
}

function assertRecord(record: DivinationSessionRecordDto): void {
  const versions = [
    record.inputSchemaVersion,
    record.divinationRulesetVersion,
    record.interpretationRulesetVersion,
    record.randomAlgorithmVersion,
    record.contentVersion,
    record.appVersion,
    record.databaseSchemaVersion,
    record.castAlgorithmVersion,
  ];
  if (
    record.sessionId.length === 0 ||
    record.timezone.length === 0 ||
    record.primaryHexagramId.length === 0 ||
    record.changedHexagramId.length === 0 ||
    versions.some((version) => !isImmutableVersion(version)) ||
    !isOptionalImmutableVersion(record.calendarAlgorithmVersion) ||
    !isOptionalImmutableVersion(record.templateVersion) ||
    !isOptionalImmutableVersion(record.aiPromptVersion) ||
    record.lines.length !== 6 ||
    record.analysisSnapshots.length === 0
  ) {
    throw new DivinationRepositoryError(
      'INVALID_HISTORY_RECORD',
      'A history record requires IDs, immutable versions, six raw lines, and an analysis snapshot.',
    );
  }
  record.lines.forEach((line, index) => assertLine(line, index + 1));
  const snapshotIds = new Set<string>();
  record.analysisSnapshots.forEach((snapshot) => {
    assertSnapshot(snapshot, record.contentVersion);
    if (
      snapshotIds.has(snapshot.snapshotId) ||
      (snapshot.reanalysisOfSnapshotId !== null &&
        !snapshotIds.has(snapshot.reanalysisOfSnapshotId))
    ) {
      throw new DivinationRepositoryError(
        'INVALID_HISTORY_RECORD',
        'Analysis snapshots must be unique and reanalysis must reference an earlier snapshot.',
      );
    }
    snapshotIds.add(snapshot.snapshotId);
  });
}

async function insertSnapshot(
  transaction: SqlExecutor,
  hashProvider: HashProvider,
  sessionId: string,
  snapshot: AnalysisSnapshotDto,
): Promise<void> {
  const payloadJson = canonicalJson(snapshot.payload);
  const payloadHash = await hashProvider.sha256(payloadJson);
  await transaction.run(
    `INSERT INTO analysis_snapshots
      (snapshot_id, session_id, schema_version, ruleset_version, content_version,
      payload_json, payload_hash, created_at, template_version, calendar_algorithm_version,
      ai_prompt_version, reanalysis_of_snapshot_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      snapshot.snapshotId,
      sessionId,
      snapshot.schemaVersion,
      snapshot.rulesetVersion,
      snapshot.contentVersion,
      payloadJson,
      payloadHash,
      snapshot.createdAt,
      snapshot.templateVersion,
      snapshot.calendarAlgorithmVersion,
      snapshot.aiPromptVersion,
      snapshot.reanalysisOfSnapshotId,
    ],
  );
}

function asStoredLine(row: LineRow): StoredCastLineDto {
  if (
    !Number.isInteger(row.line_position) ||
    row.line_position < 1 ||
    row.line_position > 6 ||
    ![2, 3].includes(row.coin_1) ||
    ![2, 3].includes(row.coin_2) ||
    ![2, 3].includes(row.coin_3) ||
    ![6, 7, 8, 9].includes(row.line_value) ||
    ![0, 1].includes(row.primary_bit) ||
    ![0, 1].includes(row.changed_bit) ||
    ![0, 1].includes(row.is_moving)
  ) {
    throw new DivinationRepositoryError(
      'INVALID_HISTORY_RECORD',
      'Stored cast line contains invalid values.',
    );
  }
  const line: StoredCastLineDto = {
    position: row.line_position as LinePosition,
    coins: [row.coin_1, row.coin_2, row.coin_3] as CoinTuple,
    value: row.line_value as LineValue,
    primaryBit: row.primary_bit as 0 | 1,
    changedBit: row.changed_bit as 0 | 1,
    isMoving: row.is_moving === 1,
  };
  assertLine(line, line.position);
  return line;
}

export class SQLiteDivinationSessionRepository implements DivinationSessionRepository {
  public constructor(
    private readonly database: SqlDatabase,
    private readonly hashProvider: HashProvider,
  ) {}

  public async append(record: DivinationSessionRecordDto): Promise<void> {
    assertRecord(record);
    await this.database.transaction(async (transaction) => {
      const [primaryHexagram, changedHexagram] = await Promise.all([
        transaction.getFirst<HexagramCodeRow>(
          `SELECT code FROM hexagrams WHERE hexagram_id = ? AND content_version = ?`,
          [record.primaryHexagramId, record.contentVersion],
        ),
        transaction.getFirst<HexagramCodeRow>(
          `SELECT code FROM hexagrams WHERE hexagram_id = ? AND content_version = ?`,
          [record.changedHexagramId, record.contentVersion],
        ),
      ]);
      const primaryCode = record.lines.map((line) => line.primaryBit).join('');
      const changedCode = record.lines.map((line) => line.changedBit).join('');
      if (primaryHexagram?.code !== primaryCode || changedHexagram?.code !== changedCode) {
        throw new DivinationRepositoryError(
          'INVALID_HISTORY_RECORD',
          'Stored hexagram IDs must match the six raw coin lines for the selected content version.',
        );
      }
      await transaction.run(
        `INSERT INTO divination_sessions
          (session_id, question, category_id, cast_at, timezone, input_schema_version,
           divination_ruleset_version, interpretation_ruleset_version,
           random_algorithm_version, content_version, primary_hexagram_id,
           changed_hexagram_id, created_at, app_version, database_schema_version,
           cast_algorithm_version, calendar_algorithm_version, template_version,
           ai_prompt_version, calendar_snapshot_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record.sessionId,
          record.question,
          record.categoryId,
          record.castAt,
          record.timezone,
          record.inputSchemaVersion,
          record.divinationRulesetVersion,
          record.interpretationRulesetVersion,
          record.randomAlgorithmVersion,
          record.contentVersion,
          record.primaryHexagramId,
          record.changedHexagramId,
          record.createdAt,
          record.appVersion,
          record.databaseSchemaVersion,
          record.castAlgorithmVersion,
          record.calendarAlgorithmVersion,
          record.templateVersion,
          record.aiPromptVersion,
          record.calendarSnapshot === null ? null : canonicalJson(record.calendarSnapshot),
        ],
      );
      for (const line of record.lines) {
        await transaction.run(
          `INSERT INTO cast_lines
            (session_id, line_position, coin_1, coin_2, coin_3, line_value,
             primary_bit, changed_bit, is_moving)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            record.sessionId,
            line.position,
            ...line.coins,
            line.value,
            line.primaryBit,
            line.changedBit,
            line.isMoving ? 1 : 0,
          ],
        );
      }
      for (const snapshot of record.analysisSnapshots) {
        await insertSnapshot(transaction, this.hashProvider, record.sessionId, snapshot);
      }
    });
  }

  public async getById(sessionId: string): Promise<DivinationSessionRecordDto | null> {
    const session = await this.database.getFirst<SessionRow>(
      `SELECT session_id, question, category_id, cast_at, timezone, input_schema_version,
              divination_ruleset_version, interpretation_ruleset_version,
              random_algorithm_version, content_version, primary_hexagram_id,
              changed_hexagram_id, created_at, app_version, database_schema_version,
              cast_algorithm_version, calendar_algorithm_version, template_version,
              ai_prompt_version, calendar_snapshot_json
       FROM divination_sessions
       WHERE session_id = ?`,
      [sessionId],
    );
    if (session === null) return null;
    const [lineRows, snapshotRows] = await Promise.all([
      this.database.getAll<LineRow>(
        `SELECT line_position, coin_1, coin_2, coin_3, line_value,
                primary_bit, changed_bit, is_moving
         FROM cast_lines WHERE session_id = ? ORDER BY line_position`,
        [sessionId],
      ),
      this.database.getAll<SnapshotRow>(
        `SELECT snapshot_id, schema_version, ruleset_version, content_version,
                payload_json, created_at, template_version, calendar_algorithm_version,
                ai_prompt_version, reanalysis_of_snapshot_id
         FROM analysis_snapshots WHERE session_id = ? ORDER BY created_at, snapshot_id`,
        [sessionId],
      ),
    ]);
    const record: DivinationSessionRecordDto = {
      sessionId: session.session_id,
      question: session.question,
      categoryId: session.category_id,
      castAt: session.cast_at,
      timezone: session.timezone,
      appVersion: session.app_version ?? 'legacy-app-version-unknown',
      databaseSchemaVersion: session.database_schema_version ?? 'legacy-database-schema-unknown',
      castAlgorithmVersion: session.cast_algorithm_version ?? session.random_algorithm_version,
      calendarAlgorithmVersion: session.calendar_algorithm_version,
      templateVersion: session.template_version,
      aiPromptVersion: session.ai_prompt_version,
      calendarSnapshot:
        session.calendar_snapshot_json === null
          ? null
          : (JSON.parse(session.calendar_snapshot_json) as unknown),
      inputSchemaVersion: session.input_schema_version,
      divinationRulesetVersion: session.divination_ruleset_version,
      interpretationRulesetVersion: session.interpretation_ruleset_version,
      randomAlgorithmVersion: session.random_algorithm_version,
      contentVersion: session.content_version,
      primaryHexagramId: session.primary_hexagram_id,
      changedHexagramId: session.changed_hexagram_id,
      createdAt: session.created_at,
      lines: lineRows.map((row) => asStoredLine(row)),
      analysisSnapshots: snapshotRows.map((row) => ({
        snapshotId: row.snapshot_id,
        schemaVersion: row.schema_version,
        rulesetVersion: row.ruleset_version,
        contentVersion: row.content_version,
        templateVersion: row.template_version,
        calendarAlgorithmVersion: row.calendar_algorithm_version,
        aiPromptVersion: row.ai_prompt_version,
        reanalysisOfSnapshotId: row.reanalysis_of_snapshot_id,
        payload: JSON.parse(row.payload_json) as unknown,
        createdAt: row.created_at,
      })),
    };
    assertRecord(record);
    return record;
  }

  public async list(): Promise<readonly DivinationSessionRecordDto[]> {
    const rows = await this.database.getAll<SessionIdRow>(
      'SELECT session_id FROM divination_sessions ORDER BY cast_at DESC, session_id DESC',
    );
    const records: DivinationSessionRecordDto[] = [];
    for (const row of rows) {
      const record = await this.getById(row.session_id);
      if (record !== null) records.push(record);
    }
    return records;
  }

  public async appendAnalysisSnapshot(
    sessionId: string,
    snapshot: AnalysisSnapshotDto,
  ): Promise<void> {
    await this.database.transaction(async (transaction) => {
      const session = await transaction.getFirst<SessionVersionRow>(
        'SELECT content_version FROM divination_sessions WHERE session_id = ?',
        [sessionId],
      );
      if (session === null) {
        throw new DivinationRepositoryError(
          'SESSION_NOT_FOUND',
          `Cannot append analysis to missing session ${sessionId}.`,
        );
      }
      assertSnapshot(snapshot, session.content_version);
      if (snapshot.reanalysisOfSnapshotId !== null) {
        const base = await transaction.getFirst<{ readonly snapshot_id: string }>(
          'SELECT snapshot_id FROM analysis_snapshots WHERE snapshot_id = ? AND session_id = ?',
          [snapshot.reanalysisOfSnapshotId, sessionId],
        );
        if (base === null) {
          throw new DivinationRepositoryError(
            'INVALID_HISTORY_RECORD',
            'Reanalysis must reference an existing snapshot from the same session.',
          );
        }
      }
      await insertSnapshot(transaction, this.hashProvider, sessionId, snapshot);
    });
  }

  public async delete(sessionId: string): Promise<boolean> {
    const result = await this.database.run('DELETE FROM divination_sessions WHERE session_id = ?', [
      sessionId,
    ]);
    return result.changes > 0;
  }

  public async deleteAll(): Promise<number> {
    const result = await this.database.run('DELETE FROM divination_sessions');
    return result.changes;
  }
}
