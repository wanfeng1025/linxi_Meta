import { randomUUID } from 'expo-crypto';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { CastingService } from '@/application/casting';
import {
  CASTING_INPUT_SCHEMA_VERSION,
  CASTING_RULESET_VERSION,
  type CastingSession,
} from '@/domain/casting';
import {
  PageApplicationService,
  type AppPreferences,
  type CastSessionMetadata,
  type HistoryItem,
  type KnowledgeItem,
  type PageResult,
  type ProfessionalChartAvailability,
  type QuestionFormValues,
} from '@/application/page';
import {
  ExpoSha256Provider,
  openApplicationDatabase,
  SQLiteDivinationSessionRepository,
  SQLiteSettingsRepository,
  type SqlDatabase,
} from '@/infrastructure/database';
import { createProductionHexagramCatalog } from '@/infrastructure/content/productionHexagramCatalog';
import { ExpoCryptoRandomSource } from '@/infrastructure/random';
import { UnavailableProfessionalChartAdapter } from '@/infrastructure/professional/UnavailableProfessionalChartAdapter';
import {
  CastingStorageError,
  SQLiteCastingSessionRepository,
} from '@/infrastructure/repositories/SQLiteCastingSessionRepository';
import { AppThemeProvider } from '@/shared/theme/AppThemeProvider';

type BootStatus = 'loading' | 'ready' | 'error';

interface AppRuntimeValue {
  readonly status: BootStatus;
  readonly bootError: string | null;
  readonly actionError: string | null;
  readonly actionBusy: boolean;
  readonly corruptedDraft: boolean;
  readonly activeSession: CastingSession | null;
  readonly activeMetadata: CastSessionMetadata | null;
  readonly history: readonly HistoryItem[];
  readonly preferences: AppPreferences;
  clearActionError(): void;
  start(values: QuestionFormValues): Promise<CastingSession>;
  castNext(sessionId: string): Promise<CastingSession>;
  undo(sessionId: string): Promise<CastingSession>;
  redo(sessionId: string): Promise<CastingSession>;
  reset(sessionId: string): Promise<CastingSession>;
  deleteDraft(sessionId: string): Promise<void>;
  clearCorruptedDraft(): Promise<void>;
  lockAndSave(sessionId: string): Promise<PageResult>;
  getResult(sessionId: string): Promise<PageResult | null>;
  refreshHistory(): Promise<void>;
  toggleFavorite(sessionId: string): Promise<boolean>;
  deleteHistory(sessionId: string): Promise<boolean>;
  clearHistory(): Promise<number>;
  exportHistory(): Promise<string>;
  listKnowledge(): readonly KnowledgeItem[];
  getKnowledge(slug: string): KnowledgeItem | null;
  getProfessionalChartAvailability(sessionId: string): ProfessionalChartAvailability;
  savePreferences(preferences: AppPreferences): Promise<void>;
  reanalyze(): never;
}

const RuntimeContext = createContext<AppRuntimeValue | null>(null);

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : '发生未知错误，请稍后重试。';
}

export function AppRuntimeProvider({ children }: PropsWithChildren) {
  const database = useRef<SqlDatabase | null>(null);
  const service = useRef<PageApplicationService | null>(null);
  const [status, setStatus] = useState<BootStatus>('loading');
  const [bootError, setBootError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [corruptedDraft, setCorruptedDraft] = useState(false);
  const [activeSession, setActiveSession] = useState<CastingSession | null>(null);
  const [activeMetadata, setActiveMetadata] = useState<CastSessionMetadata | null>(null);
  const [history, setHistory] = useState<readonly HistoryItem[]>([]);
  const [preferences, setPreferences] = useState<AppPreferences>({
    theme: 'system',
    sound: false,
    haptics: false,
    reducedHaptics: false,
    shake: false,
    animationIntensity: 'standard',
    fontSize: 'standard',
    defaultMode: 'simple',
  });

  const requireService = useCallback((): PageApplicationService => {
    if (service.current === null) throw new Error('应用服务仍在加载。');
    return service.current;
  }, []);

  const refreshHistory = useCallback(async (): Promise<void> => {
    setHistory(await requireService().listHistory());
  }, [requireService]);

  useEffect(() => {
    let cancelled = false;
    const initialize = async (): Promise<void> => {
      try {
        const now = new Date().toISOString();
        const db = await openApplicationDatabase({ appVersion: '0.1.0', migrationTimestamp: now });
        if (cancelled) {
          await db.close();
          return;
        }
        database.current = db;
        const castingRepository = new SQLiteCastingSessionRepository(db);
        const pageService = new PageApplicationService({
          castingService: new CastingService({
            repository: castingRepository,
            randomSource: new ExpoCryptoRandomSource(),
            inputSchemaVersion: CASTING_INPUT_SCHEMA_VERSION,
            rulesetVersion: CASTING_RULESET_VERSION,
          }),
          castingRepository,
          historyRepository: new SQLiteDivinationSessionRepository(db, new ExpoSha256Provider()),
          settingsRepository: new SQLiteSettingsRepository(db),
          catalog: createProductionHexagramCatalog(),
          appVersion: 'app-0.1.0',
          databaseSchemaVersion: 'sqlite-schema-v8',
          createId: randomUUID,
          professionalChartPort: new UnavailableProfessionalChartAdapter(),
        });
        service.current = pageService;
        let restored: CastingSession | null = null;
        try {
          restored = await pageService.initialize();
        } catch (error) {
          if (error instanceof CastingStorageError) setCorruptedDraft(true);
          else throw error;
        }
        const [metadata, items, storedPreferences] = await Promise.all([
          pageService.loadActiveMetadata(),
          pageService.listHistory(),
          pageService.getPreferences(),
        ]);
        if (!cancelled) {
          setActiveSession(restored);
          setActiveMetadata(metadata);
          setHistory(items);
          setPreferences(storedPreferences);
          setStatus('ready');
        }
      } catch (error) {
        if (!cancelled) {
          setBootError(toMessage(error));
          setStatus('error');
        }
      }
    };
    void initialize();
    return () => {
      cancelled = true;
      const open = database.current;
      database.current = null;
      service.current = null;
      if (open !== null) void open.close();
    };
  }, []);

  const run = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    setActionBusy(true);
    setActionError(null);
    try {
      return await operation();
    } catch (error) {
      setActionError(toMessage(error));
      throw error;
    } finally {
      setActionBusy(false);
    }
  }, []);

  const value = useMemo<AppRuntimeValue>(
    () => ({
      status,
      bootError,
      actionError,
      actionBusy,
      corruptedDraft,
      activeSession,
      activeMetadata,
      history,
      preferences,
      clearActionError: () => setActionError(null),
      start: (values) =>
        run(async () => {
          const session = await requireService().start(values);
          setActiveSession(session);
          setActiveMetadata(await requireService().loadActiveMetadata());
          return session;
        }),
      castNext: (sessionId) =>
        run(async () => {
          const session = await requireService().castNext(
            sessionId,
            activeSession?.sessionId === sessionId ? activeSession.lines.length : -1,
          );
          setActiveSession(session);
          return session;
        }),
      undo: (sessionId) =>
        run(async () => {
          const session = await requireService().undo(
            sessionId,
            activeSession?.sessionId === sessionId ? activeSession.lines.length : -1,
          );
          setActiveSession(session);
          return session;
        }),
      redo: (sessionId) =>
        run(async () => {
          const session = await requireService().restoreUndone(
            sessionId,
            activeSession?.sessionId === sessionId ? activeSession.lines.length : -1,
          );
          setActiveSession(session);
          return session;
        }),
      reset: (sessionId) =>
        run(async () => {
          const session = await requireService().reset(
            sessionId,
            activeSession?.sessionId === sessionId ? activeSession.lines.length : -1,
          );
          setActiveSession(session);
          return session;
        }),
      deleteDraft: (sessionId) =>
        run(async () => {
          await requireService().deleteDraft(sessionId);
          setActiveSession(null);
          setActiveMetadata(null);
        }),
      clearCorruptedDraft: () =>
        run(async () => {
          await requireService().clearCorruptedDraft();
          setCorruptedDraft(false);
          setActiveSession(null);
          setActiveMetadata(null);
        }),
      lockAndSave: (sessionId) =>
        run(async () => {
          const result = await requireService().lockAndSave(
            sessionId,
            activeSession?.sessionId === sessionId ? activeSession.lines.length : -1,
          );
          setActiveSession(null);
          setActiveMetadata(null);
          setHistory(await requireService().listHistory());
          return result;
        }),
      getResult: (sessionId) => run(() => requireService().getResult(sessionId)),
      refreshHistory: () => run(refreshHistory),
      toggleFavorite: (sessionId) =>
        run(async () => {
          const favorite = await requireService().toggleFavorite(sessionId);
          setHistory(await requireService().listHistory());
          return favorite;
        }),
      deleteHistory: (sessionId) =>
        run(async () => {
          const deleted = await requireService().deleteHistory(sessionId);
          setHistory(await requireService().listHistory());
          return deleted;
        }),
      clearHistory: () =>
        run(async () => {
          const deleted = await requireService().clearHistory();
          setHistory([]);
          return deleted;
        }),
      exportHistory: () => run(() => requireService().exportHistory()),
      listKnowledge: () => requireService().listKnowledge(),
      getKnowledge: (slug) => requireService().getKnowledge(slug),
      getProfessionalChartAvailability: (sessionId) =>
        requireService().getProfessionalChartAvailability(sessionId),
      savePreferences: (next) =>
        run(async () => {
          await requireService().savePreferences(next);
          setPreferences(next);
        }),
      reanalyze: () => requireService().reanalyze(),
    }),
    [
      actionBusy,
      actionError,
      activeMetadata,
      activeSession,
      bootError,
      corruptedDraft,
      history,
      preferences,
      refreshHistory,
      requireService,
      run,
      status,
    ],
  );

  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>;
}

export function useAppRuntime(): AppRuntimeValue {
  const value = useContext(RuntimeContext);
  if (value === null) throw new Error('useAppRuntime must be used inside AppRuntimeProvider.');
  return value;
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <AppRuntimeProvider>
      <ThemedRuntime>{children}</ThemedRuntime>
    </AppRuntimeProvider>
  );
}

function ThemedRuntime({ children }: PropsWithChildren) {
  const { preferences } = useAppRuntime();
  return (
    <AppThemeProvider preference={preferences.theme} fontSize={preferences.fontSize}>
      {children}
    </AppThemeProvider>
  );
}
