import type { CastingService, CastingSessionRepository } from '@/application/casting';
import type {
  DivinationSessionRecordDto,
  DivinationSessionRepository,
  SettingsRepository,
  StoredCastLineDto,
} from '@/application/repositories';
import type { CastingSession } from '@/domain/casting';
import { calculateHexagram, type HexagramCatalog } from '@/domain/hexagram';

import {
  DEFAULT_PREFERENCES,
  type AppPreferences,
  type CastSessionMetadata,
  type HistoryItem,
  type KnowledgeItem,
  type PageResult,
  type QuestionFormValues,
  type StructureOnlySnapshot,
} from './types';
import { questionFormSchema } from './validation';
import type {
  ProfessionalChartAvailability,
  ProfessionalChartPagePort,
} from './ProfessionalChartPagePort';

const METADATA_KEY = 'page.active-casting-metadata-v1';
const FAVORITES_KEY = 'page.history-favorites-v1';
const PREFERENCES_KEY = 'page.preferences-v1';
const INTERPRETATION_UNAVAILABLE_VERSION = 'interpretation-rules-unavailable-v1';
const SNAPSHOT_SCHEMA_VERSION = 'page-structure-snapshot-v1';

export interface RecoverableCastingSessionRepository extends CastingSessionRepository {
  loadPendingCompletedSession(sessionId?: string): Promise<CastingSession | null>;
  acknowledgeCompletedSession(sessionId: string): Promise<void>;
  clearCorruptedState(): Promise<void>;
}

export interface PageApplicationServiceOptions {
  readonly castingService: CastingService;
  readonly castingRepository: RecoverableCastingSessionRepository;
  readonly historyRepository: DivinationSessionRepository;
  readonly settingsRepository: SettingsRepository;
  readonly catalog: HexagramCatalog;
  readonly appVersion: string;
  readonly databaseSchemaVersion: string;
  readonly now?: () => string;
  readonly createId: () => string;
  readonly timezone?: () => string;
  readonly professionalChartPort: ProfessionalChartPagePort;
}

export class PageCapabilityError extends Error {
  public override readonly name = 'PageCapabilityError';

  public constructor(
    public readonly code:
      | 'SHAKE_NOT_AVAILABLE'
      | 'PROFESSIONAL_RULES_NOT_AVAILABLE'
      | 'INTERPRETATION_RULES_NOT_AVAILABLE'
      | 'INVALID_STORED_RESULT',
    message: string,
  ) {
    super(message);
  }
}

function toStoredLine(line: CastingSession['lines'][number]): StoredCastLineDto {
  return {
    position: line.position,
    coins: line.coins,
    value: line.value,
    primaryBit: line.polarity === 'yang' ? 1 : 0,
    changedBit: line.changedPolarity === 'yang' ? 1 : 0,
    isMoving: line.movement === 'moving',
  };
}

function isStructureOnlySnapshot(value: unknown): value is StructureOnlySnapshot {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Readonly<Record<string, unknown>>;
  return (
    record.kind === 'structure-only' &&
    record.capability === 'interpretation-rules-unavailable' &&
    typeof record.metadata === 'object' &&
    typeof record.primaryHexagram === 'object' &&
    typeof record.changedHexagram === 'object' &&
    Array.isArray(record.movingLines) &&
    Array.isArray(record.lines) &&
    typeof record.oneLineConclusion === 'string'
  );
}

function parseFavorites(value: string | null): ReadonlySet<string> {
  if (value === null) return new Set();
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) {
      return new Set();
    }
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

function parsePreferences(value: string | null): AppPreferences {
  if (value === null) return DEFAULT_PREFERENCES;
  try {
    const parsed = JSON.parse(value) as Partial<AppPreferences>;
    return {
      theme: ['system', 'light', 'dark'].includes(parsed.theme ?? '')
        ? (parsed.theme as AppPreferences['theme'])
        : DEFAULT_PREFERENCES.theme,
      sound: typeof parsed.sound === 'boolean' ? parsed.sound : DEFAULT_PREFERENCES.sound,
      haptics: typeof parsed.haptics === 'boolean' ? parsed.haptics : DEFAULT_PREFERENCES.haptics,
      reducedHaptics:
        typeof parsed.reducedHaptics === 'boolean'
          ? parsed.reducedHaptics
          : DEFAULT_PREFERENCES.reducedHaptics,
      shake: typeof parsed.shake === 'boolean' ? parsed.shake : DEFAULT_PREFERENCES.shake,
      animationIntensity: ['reduced', 'standard', 'enhanced'].includes(
        parsed.animationIntensity ?? '',
      )
        ? (parsed.animationIntensity as AppPreferences['animationIntensity'])
        : DEFAULT_PREFERENCES.animationIntensity,
      fontSize: ['standard', 'large', 'extra-large'].includes(parsed.fontSize ?? '')
        ? (parsed.fontSize as AppPreferences['fontSize'])
        : DEFAULT_PREFERENCES.fontSize,
      defaultMode: ['simple', 'professional'].includes(parsed.defaultMode ?? '')
        ? (parsed.defaultMode as AppPreferences['defaultMode'])
        : DEFAULT_PREFERENCES.defaultMode,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export class PageApplicationService {
  private readonly now: () => string;
  private readonly timezone: () => string;

  public constructor(private readonly options: PageApplicationServiceOptions) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.timezone =
      options.timezone ?? (() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Etc/UTC');
  }

  public async initialize(): Promise<CastingSession | null> {
    const pending = await this.options.castingRepository.loadPendingCompletedSession();
    if (pending !== null) {
      const existing = await this.options.historyRepository.getById(pending.sessionId);
      if (existing === null) await this.persistLockedSession(pending);
      await this.options.castingRepository.acknowledgeCompletedSession(pending.sessionId);
    }
    return this.options.castingService.restoreActiveSession();
  }

  public async start(values: QuestionFormValues): Promise<CastingSession> {
    const parsed = questionFormSchema.parse(values);
    const createdAt = this.now();
    const sessionId = this.options.createId();
    const session = await this.options.castingService.startSession({
      sessionId,
      method: parsed.method,
      createdAt,
    });
    const metadata: CastSessionMetadata = {
      schemaVersion: 'page-cast-metadata-v1',
      sessionId,
      values: parsed,
      submittedAt: createdAt,
      timezone: this.timezone(),
    };
    try {
      await this.options.settingsRepository.set(METADATA_KEY, JSON.stringify(metadata), createdAt);
    } catch (error) {
      await this.options.castingService.deleteDraft(sessionId);
      throw error;
    }
    return session;
  }

  public async loadActiveMetadata(): Promise<CastSessionMetadata | null> {
    const value = await this.options.settingsRepository.get(METADATA_KEY);
    if (value === null || value.length === 0) return null;
    try {
      const parsed = JSON.parse(value) as Partial<CastSessionMetadata>;
      const form = questionFormSchema.safeParse(parsed.values);
      if (
        parsed.schemaVersion !== 'page-cast-metadata-v1' ||
        typeof parsed.sessionId !== 'string' ||
        typeof parsed.submittedAt !== 'string' ||
        typeof parsed.timezone !== 'string' ||
        !form.success
      ) {
        return null;
      }
      return {
        schemaVersion: 'page-cast-metadata-v1',
        sessionId: parsed.sessionId,
        values: form.data,
        submittedAt: parsed.submittedAt,
        timezone: parsed.timezone,
      };
    } catch {
      return null;
    }
  }

  public async castNext(sessionId: string, expectedLineCount: number): Promise<CastingSession> {
    return this.options.castingService.castNext({
      sessionId,
      expectedLineCount,
      updatedAt: this.now(),
    });
  }

  public async undo(sessionId: string, expectedLineCount: number): Promise<CastingSession> {
    return this.options.castingService.undo({
      sessionId,
      expectedLineCount,
      updatedAt: this.now(),
    });
  }

  public async restoreUndone(
    sessionId: string,
    expectedLineCount: number,
  ): Promise<CastingSession> {
    return this.options.castingService.restoreUndone({
      sessionId,
      expectedLineCount,
      updatedAt: this.now(),
    });
  }

  public async reset(sessionId: string, expectedLineCount: number): Promise<CastingSession> {
    return this.options.castingService.reset({
      sessionId,
      expectedLineCount,
      updatedAt: this.now(),
    });
  }

  public async deleteDraft(sessionId: string): Promise<void> {
    await this.options.castingService.deleteDraft(sessionId);
    await this.options.settingsRepository.set(METADATA_KEY, '', this.now());
  }

  public async clearCorruptedDraft(): Promise<void> {
    await this.options.castingRepository.clearCorruptedState();
    await this.options.settingsRepository.set(METADATA_KEY, '', this.now());
  }

  public async lockAndSave(sessionId: string, expectedLineCount: number): Promise<PageResult> {
    const locked = await this.options.castingService.lock({
      sessionId,
      expectedLineCount,
      updatedAt: this.now(),
    });
    await this.persistLockedSession(locked);
    await this.options.castingRepository.acknowledgeCompletedSession(sessionId);
    await this.options.settingsRepository.set(METADATA_KEY, '', this.now());
    const result = await this.getResult(sessionId);
    if (result === null) throw new Error('Locked history could not be reloaded.');
    return result;
  }

  public async getResult(sessionId: string): Promise<PageResult | null> {
    const record = await this.options.historyRepository.getById(sessionId);
    if (record === null) return null;
    const latest = record.analysisSnapshots.at(-1)?.payload;
    if (!isStructureOnlySnapshot(latest)) {
      throw new PageCapabilityError('INVALID_STORED_RESULT', '历史快照无法通过页面 Schema 校验。');
    }
    const favorites = await this.getFavorites();
    return {
      sessionId,
      castAt: record.castAt,
      timezone: record.timezone,
      snapshot: latest,
      snapshotCount: record.analysisSnapshots.length,
      favorite: favorites.has(sessionId),
    };
  }

  public async listHistory(): Promise<readonly HistoryItem[]> {
    const [records, favorites] = await Promise.all([
      this.options.historyRepository.list(),
      this.getFavorites(),
    ]);
    return records.flatMap((record) => {
      const payload = record.analysisSnapshots.at(-1)?.payload;
      if (!isStructureOnlySnapshot(payload)) return [];
      return [
        {
          sessionId: record.sessionId,
          question: record.question ?? '未记录问题',
          category: payload.metadata.values.category,
          castAt: record.castAt,
          primaryName: payload.primaryHexagram.name,
          changedName: payload.changedHexagram.name,
          movingLineCount: payload.movingLines.length,
          favorite: favorites.has(record.sessionId),
          snapshotCount: record.analysisSnapshots.length,
        },
      ];
    });
  }

  public listKnowledge(): readonly KnowledgeItem[] {
    const verified: KnowledgeItem[] = [
      ...this.options.catalog.trigrams.map((trigram) => ({
        slug: trigram.id,
        title: `${trigram.symbol} ${trigram.name}卦`,
        symbol: trigram.symbol,
        status: 'verified' as const,
        kind: 'trigram' as const,
        summary: `已核验的三爻结构，编码 ${trigram.code}（初爻到上爻）。`,
        contentVersion: trigram.dataVersion,
        facts: [
          `稳定 ID：${trigram.id}`,
          `结构编码：${trigram.code}`,
          `方向字段：${trigram.direction ?? '未提供'}`,
          `五行字段：${trigram.element ?? '未提供'}`,
        ],
      })),
      ...this.options.catalog.hexagrams.map((hexagram) => ({
        slug: hexagram.id,
        title: `${hexagram.symbol} 第${hexagram.kingWenSequence}卦 · ${hexagram.name}`,
        symbol: hexagram.symbol,
        status: 'verified' as const,
        kind: 'hexagram' as const,
        summary: `已核验的上下卦结构映射，编码 ${hexagram.code}。`,
        contentVersion: hexagram.dataVersion,
        facts: [
          `稳定 ID：${hexagram.id}`,
          `上卦：${hexagram.upperTrigramId}`,
          `下卦：${hexagram.lowerTrigramId}`,
          `结构编码：${hexagram.code}（初爻到上爻）`,
        ],
      })),
    ];
    const pendingTopics = [
      '阴阳五行',
      '天干地支',
      '六亲',
      '六神',
      '纳甲',
      '世应',
      '动爻传统解释',
      '常见术语',
    ].map<KnowledgeItem>((title, index) => ({
      slug: `pending-topic-${index + 1}`,
      title,
      symbol: '待',
      status: 'pending',
      kind: 'topic',
      summary: '来源、授权或规则体系尚未完成审核，当前不作为权威内容展示。',
      contentVersion: null,
      facts: [],
    }));
    return [...verified, ...pendingTopics];
  }

  public getKnowledge(slug: string): KnowledgeItem | null {
    return this.listKnowledge().find((item) => item.slug === slug) ?? null;
  }

  public async toggleFavorite(sessionId: string): Promise<boolean> {
    const favorites = new Set(await this.getFavorites());
    const favorite = !favorites.has(sessionId);
    if (favorite) favorites.add(sessionId);
    else favorites.delete(sessionId);
    await this.options.settingsRepository.set(
      FAVORITES_KEY,
      JSON.stringify([...favorites].sort()),
      this.now(),
    );
    return favorite;
  }

  public async deleteHistory(sessionId: string): Promise<boolean> {
    const deleted = await this.options.historyRepository.delete(sessionId);
    if (deleted) {
      const favorites = new Set(await this.getFavorites());
      favorites.delete(sessionId);
      await this.options.settingsRepository.set(
        FAVORITES_KEY,
        JSON.stringify([...favorites].sort()),
        this.now(),
      );
    }
    return deleted;
  }

  public async clearHistory(): Promise<number> {
    const deleted = await this.options.historyRepository.deleteAll();
    await this.options.settingsRepository.set(FAVORITES_KEY, '[]', this.now());
    return deleted;
  }

  public async exportHistory(): Promise<string> {
    const records = await this.options.historyRepository.list();
    return JSON.stringify(
      {
        schemaVersion: 'liuyao-history-export-v1',
        exportedAt: this.now(),
        records,
      },
      null,
      2,
    );
  }

  public async getPreferences(): Promise<AppPreferences> {
    return parsePreferences(await this.options.settingsRepository.get(PREFERENCES_KEY));
  }

  public async savePreferences(preferences: AppPreferences): Promise<void> {
    await this.options.settingsRepository.set(
      PREFERENCES_KEY,
      JSON.stringify(preferences),
      this.now(),
    );
  }

  public reanalyze(): never {
    throw new PageCapabilityError(
      'INTERPRETATION_RULES_NOT_AVAILABLE',
      '当前没有已核验的新解释规则；旧快照会保留，规则发布后才能追加重新分析快照。',
    );
  }

  public getProfessionalChartAvailability(sessionId: string): ProfessionalChartAvailability {
    return this.options.professionalChartPort.getAvailability(sessionId);
  }

  private async getFavorites(): Promise<ReadonlySet<string>> {
    return parseFavorites(await this.options.settingsRepository.get(FAVORITES_KEY));
  }

  private async persistLockedSession(session: CastingSession): Promise<void> {
    if (session.status !== 'locked' || session.lockedAt === null) {
      throw new Error('Only a locked session can be persisted as history.');
    }
    const existing = await this.options.historyRepository.getById(session.sessionId);
    if (existing !== null) return;
    const metadata = await this.loadActiveMetadata();
    if (metadata === null || metadata.sessionId !== session.sessionId) {
      throw new Error('Submitted question metadata is missing for the locked session.');
    }
    const result = calculateHexagram({
      originalLines: session.lines.map((line) => ({ position: line.position, value: line.value })),
      rulesetVersion: session.rulesetVersion,
      catalog: this.options.catalog,
    });
    const snapshot: StructureOnlySnapshot = {
      kind: 'structure-only',
      capability: 'interpretation-rules-unavailable',
      metadata,
      primaryHexagram: {
        id: result.primaryHexagram.id,
        name: result.primaryHexagram.name,
        symbol: result.primaryHexagram.symbol,
        kingWenSequence: result.primaryHexagram.kingWenSequence,
        code: result.primaryHexagram.code,
      },
      changedHexagram: {
        id: result.changedHexagram.id,
        name: result.changedHexagram.name,
        symbol: result.changedHexagram.symbol,
        kingWenSequence: result.changedHexagram.kingWenSequence,
        code: result.changedHexagram.code,
      },
      movingLines: result.movingLines,
      lines: session.lines,
      oneLineConclusion: '已完成可复核的卦象结构；经核验解释规则尚未发布，暂不生成吉凶结论。',
      primarySymbol: null,
      auxiliarySymbols: [],
      trend: null,
      recommendations: [],
      rationale: [
        {
          id: 'evidence-raw-coins',
          title: '三枚铜钱原值',
          detail: '每一爻均保存三枚铜钱的 2/3 原值，并由合计确定 6、7、8、9。',
          source: session.rulesetVersion,
        },
        {
          id: 'evidence-line-order',
          title: '爻位顺序',
          detail: '内部记录从初爻到上爻；页面仅在展示时倒序。',
          source: session.inputSchemaVersion,
        },
        {
          id: 'evidence-hexagram-map',
          title: '卦象映射',
          detail: '本卦与变卦来自已核验的显式上下卦映射。',
          source: result.mappingDataVersion,
        },
      ],
      riskStatement: '仅供文化学习与个人反思，不替代医疗、法律、财务或其他专业意见。',
      rulesetVersion: session.rulesetVersion,
      contentVersion: result.mappingDataVersion,
    };
    const record: DivinationSessionRecordDto = {
      sessionId: session.sessionId,
      question: metadata.values.question,
      categoryId: null,
      castAt: session.lockedAt,
      timezone: metadata.timezone,
      appVersion: this.options.appVersion,
      databaseSchemaVersion: this.options.databaseSchemaVersion,
      castAlgorithmVersion: session.rulesetVersion,
      calendarAlgorithmVersion: null,
      templateVersion: null,
      aiPromptVersion: null,
      calendarSnapshot: null,
      inputSchemaVersion: session.inputSchemaVersion,
      divinationRulesetVersion: session.rulesetVersion,
      interpretationRulesetVersion: INTERPRETATION_UNAVAILABLE_VERSION,
      randomAlgorithmVersion: session.randomAlgorithmVersion,
      contentVersion: result.mappingDataVersion,
      primaryHexagramId: result.primaryHexagram.id,
      changedHexagramId: result.changedHexagram.id,
      createdAt: session.createdAt,
      lines: session.lines.map(toStoredLine),
      analysisSnapshots: [
        {
          snapshotId: this.options.createId(),
          schemaVersion: SNAPSHOT_SCHEMA_VERSION,
          rulesetVersion: INTERPRETATION_UNAVAILABLE_VERSION,
          contentVersion: result.mappingDataVersion,
          templateVersion: null,
          calendarAlgorithmVersion: null,
          aiPromptVersion: null,
          reanalysisOfSnapshotId: null,
          payload: snapshot,
          createdAt: session.lockedAt,
        },
      ],
    };
    await this.options.historyRepository.append(record);
  }
}
