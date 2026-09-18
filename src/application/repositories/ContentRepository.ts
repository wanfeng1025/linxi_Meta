import type { ContentImportReportDto, ContentVersionDto, DataSourceDto } from './types';

export interface ContentRepository {
  getVersion(contentVersion: string): Promise<ContentVersionDto | null>;
  listSources(): Promise<readonly DataSourceDto[]>;
  getImportReport(contentVersion: string): Promise<ContentImportReportDto | null>;
}
