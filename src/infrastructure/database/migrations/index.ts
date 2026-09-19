import { migration001 } from './001_create_schema_migrations';
import { migration002 } from './002_create_content_schema';
import { migration003 } from './003_create_history_schema';
import { migration004 } from './004_create_indexes';
import { migration005 } from './005_expand_auditable_content_model';
import { migration006 } from './006_quarantine_legacy_professional_rules';
import { migration007 } from './007_create_professional_candidate_staging';
import { migration008 } from './008_nullable_changed_hexagram';

export { MigrationError, runMigrations } from './runner';
export type { Migration } from './types';

export const migrations = [
  migration001,
  migration002,
  migration003,
  migration004,
  migration005,
  migration006,
  migration007,
  migration008,
] as const;
