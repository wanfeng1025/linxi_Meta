import { createHash } from 'node:crypto';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import type {
  HashProvider,
  SqlDatabase,
  SqlExecutor,
  SqlRunResult,
  SqlValue,
} from '../../src/infrastructure/database';

function parameters(values: readonly SqlValue[]): SQLInputValue[] {
  return [...values];
}

export class NodeSqliteDatabase implements SqlDatabase {
  private readonly database: DatabaseSync;

  public constructor(path = ':memory:') {
    this.database = new DatabaseSync(path);
    this.database.exec('PRAGMA foreign_keys = ON');
  }

  public async exec(sql: string): Promise<void> {
    this.database.exec(sql);
  }

  public async run(sql: string, params: readonly SqlValue[] = []): Promise<SqlRunResult> {
    const result = this.database.prepare(sql).run(...parameters(params));
    return {
      changes: Number(result.changes),
      lastInsertRowId: Number(result.lastInsertRowid),
    };
  }

  public async getFirst<Row>(sql: string, params: readonly SqlValue[] = []): Promise<Row | null> {
    const row = this.database.prepare(sql).get(...parameters(params));
    return row === undefined ? null : (row as Row);
  }

  public async getAll<Row>(sql: string, params: readonly SqlValue[] = []): Promise<readonly Row[]> {
    return this.database.prepare(sql).all(...parameters(params)) as Row[];
  }

  public async transaction<Result>(
    task: (transaction: SqlExecutor) => Promise<Result>,
  ): Promise<Result> {
    this.database.exec('BEGIN IMMEDIATE');
    try {
      const result = await task(this);
      this.database.exec('COMMIT');
      return result;
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }

  public async close(): Promise<void> {
    this.database.close();
  }
}

export class NodeSha256Provider implements HashProvider {
  public async sha256(value: string): Promise<string> {
    return createHash('sha256').update(value).digest('hex');
  }
}
