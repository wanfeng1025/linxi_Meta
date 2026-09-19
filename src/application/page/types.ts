import type { CastLine, CastingMethod, CastingSession, LinePosition } from '@/domain/casting';
import type { HexagramChangeStatus, HexagramDefinition } from '@/domain/hexagram';

export const QUESTION_CATEGORIES = [
  'general-decision',
  'career',
  'job-search',
  'study',
  'wealth',
  'investment',
  'cooperation',
  'relationship',
  'marriage',
  'travel',
  'lost-property',
  'health',
  'dispute',
  'legal',
] as const;

export type QuestionCategory = (typeof QUESTION_CATEGORIES)[number];
export type TimeHorizon = 'within-week' | 'within-month' | 'within-year' | 'open-ended';
export type AskingFor = 'self' | 'other';
export type DivinationMode = 'simple' | 'professional';

export interface QuestionFormValues {
  readonly question: string;
  readonly category: QuestionCategory;
  readonly timeHorizon: TimeHorizon;
  readonly askingFor: AskingFor;
  readonly mode: DivinationMode;
  readonly method: CastingMethod;
  readonly notes: string;
}

export interface CastSessionMetadata {
  readonly schemaVersion: 'page-cast-metadata-v1';
  readonly sessionId: string;
  readonly values: QuestionFormValues;
  readonly submittedAt: string;
  readonly timezone: string;
}

export interface StructureOnlySnapshot {
  readonly kind: 'structure-only';
  readonly capability: 'interpretation-rules-unavailable';
  readonly metadata: CastSessionMetadata;
  readonly primaryHexagram: Pick<
    HexagramDefinition,
    'id' | 'name' | 'symbol' | 'kingWenSequence' | 'code'
  >;
  readonly changeStatus: HexagramChangeStatus;
  readonly changedHexagram: Pick<
    HexagramDefinition,
    'id' | 'name' | 'symbol' | 'kingWenSequence' | 'code'
  > | null;
  readonly movingLines: readonly LinePosition[];
  readonly lines: readonly CastLine[];
  readonly oneLineConclusion: string;
  readonly primarySymbol: null;
  readonly auxiliarySymbols: readonly [];
  readonly trend: null;
  readonly recommendations: readonly string[];
  readonly rationale: readonly {
    id: string;
    title: string;
    detail: string;
    source: string;
  }[];
  readonly riskStatement: string;
  readonly rulesetVersion: string;
  readonly contentVersion: string;
}

export interface PageResult {
  readonly sessionId: string;
  readonly castAt: string;
  readonly timezone: string;
  readonly snapshot: StructureOnlySnapshot;
  readonly snapshotCount: number;
  readonly favorite: boolean;
}

export interface HistoryItem {
  readonly sessionId: string;
  readonly question: string;
  readonly category: QuestionCategory;
  readonly castAt: string;
  readonly primaryName: string;
  readonly changedName: string | null;
  readonly movingLineCount: number;
  readonly favorite: boolean;
  readonly snapshotCount: number;
}

export interface KnowledgeItem {
  readonly slug: string;
  readonly title: string;
  readonly symbol: string;
  readonly status: 'verified' | 'pending';
  readonly kind: 'trigram' | 'hexagram' | 'topic';
  readonly summary: string;
  readonly contentVersion: string | null;
  readonly facts: readonly string[];
}

export interface CastScreenProjection {
  readonly session: CastingSession;
  readonly topDownLines: readonly CastLine[];
  readonly nextPosition: LinePosition | null;
  readonly progressLabel: string;
  readonly locked: boolean;
}

export type ThemePreference = 'system' | 'light' | 'dark';
export type AnimationIntensity = 'reduced' | 'standard' | 'enhanced';
export type FontSizePreference = 'standard' | 'large' | 'extra-large';

export interface AppPreferences {
  readonly theme: ThemePreference;
  readonly sound: boolean;
  readonly haptics: boolean;
  readonly reducedHaptics: boolean;
  readonly shake: boolean;
  readonly animationIntensity: AnimationIntensity;
  readonly fontSize: FontSizePreference;
  readonly defaultMode: DivinationMode;
}

export const DEFAULT_PREFERENCES: AppPreferences = Object.freeze({
  theme: 'system',
  sound: false,
  haptics: false,
  reducedHaptics: false,
  shake: false,
  animationIntensity: 'standard',
  fontSize: 'standard',
  defaultMode: 'simple',
});
