export type SqlValue = string | number | null | Uint8Array;

export interface SqlRunResult {
  readonly changes: number;
  readonly lastInsertRowId: number;
}

export interface SqlExecutor {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: readonly SqlValue[]): Promise<SqlRunResult>;
  getFirst<Row>(sql: string, params?: readonly SqlValue[]): Promise<Row | null>;
  getAll<Row>(sql: string, params?: readonly SqlValue[]): Promise<readonly Row[]>;
}

export interface SqlDatabase extends SqlExecutor {
  transaction<Result>(task: (transaction: SqlExecutor) => Promise<Result>): Promise<Result>;
  close(): Promise<void>;
}

export interface HashProvider {
  sha256(value: string): Promise<string>;
}
