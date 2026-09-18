import type { AnalysisSnapshotDto, DivinationSessionRecordDto } from './types';

export interface DivinationSessionRepository {
  append(record: DivinationSessionRecordDto): Promise<void>;
  getById(sessionId: string): Promise<DivinationSessionRecordDto | null>;
  list(): Promise<readonly DivinationSessionRecordDto[]>;
  appendAnalysisSnapshot(sessionId: string, snapshot: AnalysisSnapshotDto): Promise<void>;
  delete(sessionId: string): Promise<boolean>;
  deleteAll(): Promise<number>;
}
