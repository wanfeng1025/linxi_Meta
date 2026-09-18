import type {
  ContentRepository,
  ContentImportReportDto,
  ContentVersionDto,
  DataSourceDto,
} from '@/application/repositories';

import type { SqlDatabase } from '../types';

interface ContentVersionRow {
  readonly content_version: string;
  readonly schema_version: string;
  readonly status: 'draft' | 'verified';
  readonly completeness_mode: 'partial' | 'complete';
  readonly payload_hash: string;
  readonly record_count: number;
  readonly imported_at: string;
}

interface DataSourceRow {
  readonly source_id: string;
  readonly source_version: string;
  readonly title: string;
  readonly edition: string | null;
  readonly author_or_editor: string | null;
  readonly dynasty_or_year: string | null;
  readonly publisher_or_platform: string | null;
  readonly url: string | null;
  readonly source_type: string;
  readonly canonical_source_type: string | null;
  readonly license_status: string;
  readonly public_domain_status: string | null;
  readonly proofreading_status: string | null;
  readonly reliability_grade: string | null;
  readonly status: 'draft' | 'verified';
}

interface ImportReportRow {
  readonly content_version: string;
  readonly source_file: string;
  readonly payload_hash: string;
  readonly validation_report_json: string;
  readonly imported_at: string;
}

export class SQLiteContentRepository implements ContentRepository {
  public constructor(private readonly database: SqlDatabase) {}

  public async getVersion(contentVersion: string): Promise<ContentVersionDto | null> {
    const row = await this.database.getFirst<ContentVersionRow>(
      `SELECT content_version, schema_version, status, completeness_mode, payload_hash,
              record_count, imported_at
       FROM content_versions
       WHERE content_version = ?`,
      [contentVersion],
    );
    return row === null
      ? null
      : {
          contentVersion: row.content_version,
          schemaVersion: row.schema_version,
          status: row.status,
          completenessMode: row.completeness_mode,
          payloadHash: row.payload_hash,
          recordCount: row.record_count,
          importedAt: row.imported_at,
        };
  }

  public async listSources(): Promise<readonly DataSourceDto[]> {
    const rows = await this.database.getAll<DataSourceRow>(
      `SELECT source_id, source_version, title, edition, author_or_editor, dynasty_or_year,
              publisher_or_platform, url, source_type, canonical_source_type, license_status,
              public_domain_status, proofreading_status, reliability_grade, status
       FROM data_sources
       ORDER BY source_id, source_version`,
    );
    return rows.map((row) => ({
      sourceId: row.source_id,
      sourceVersion: row.source_version,
      title: row.title,
      edition: row.edition,
      authorOrEditor: row.author_or_editor,
      dynastyOrYear: row.dynasty_or_year,
      publisherOrPlatform: row.publisher_or_platform,
      url: row.url,
      sourceType: row.canonical_source_type ?? row.source_type,
      licenseStatus: row.license_status,
      publicDomainStatus: row.public_domain_status,
      proofreadingStatus: row.proofreading_status,
      reliabilityGrade: row.reliability_grade,
      status: row.status,
    }));
  }

  public async getImportReport(contentVersion: string): Promise<ContentImportReportDto | null> {
    const row = await this.database.getFirst<ImportReportRow>(
      `SELECT content_version, source_file, payload_hash, validation_report_json, imported_at
       FROM content_import_reports WHERE content_version = ?`,
      [contentVersion],
    );
    return row === null
      ? null
      : {
          contentVersion: row.content_version,
          sourceFile: row.source_file,
          payloadHash: row.payload_hash,
          validationReport: JSON.parse(row.validation_report_json) as unknown,
          importedAt: row.imported_at,
        };
  }
}
