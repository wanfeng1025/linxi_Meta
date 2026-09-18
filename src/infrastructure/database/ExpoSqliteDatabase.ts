import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import type { SqlDatabase, SqlExecutor, SqlRunResult, SqlValue } from './types';

function bindValues(params: readonly SqlValue[]): SQLiteBindValue[] {
  return [...params];
}

class ExpoSqlExecutor implements SqlExecutor {
  public constructor(protected readonly database: SQLiteDatabase) {}

  public async exec(sql: string): Promise<void> {
    await this.database.execAsync(sql);
  }

  public async run(sql: string, params: readonly SqlValue[] = []): Promise<SqlRunResult> {
    return this.database.runAsync(sql, bindValues(params));
  }

  public async getFirst<Row>(sql: string, params: readonly SqlValue[] = []): Promise<Row | null> {
    return this.database.getFirstAsync<Row>(sql, bindValues(params));
  }

  public async getAll<Row>(sql: string, params: readonly SqlValue[] = []): Promise<readonly Row[]> {
    return this.database.getAllAsync<Row>(sql, bindValues(params));
  }
}

export class ExpoSqliteDatabase extends ExpoSqlExecutor implements SqlDatabase {
  public async transaction<Result>(
    task: (transaction: SqlExecutor) => Promise<Result>,
  ): Promise<Result> {
    let completed = false;
    let result!: Result;
    if (Platform.OS === 'web') {
      await this.database.withTransactionAsync(async () => {
        result = await task(new ExpoSqlExecutor(this.database));
        completed = true;
      });
    } else {
      await this.database.withExclusiveTransactionAsync(async (transaction) => {
        result = await task(new ExpoSqlExecutor(transaction));
        completed = true;
      });
    }
    if (!completed) {
      throw new Error('SQLite transaction completed without returning a result.');
    }
    return result;
  }

  public async close(): Promise<void> {
    await this.database.closeAsync();
  }
}
