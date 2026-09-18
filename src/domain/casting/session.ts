import { CastingDomainError } from './errors';
import { assertImmutableVersion, createCastLine, isLinePosition, restoreCastLine } from './line';
import type {
  CastLine,
  CastingMethod,
  CastingProgress,
  CastingSession,
  CastingStatus,
  CoinTuple,
  CreateCastingSessionInput,
  LinePosition,
} from './types';

const CASTING_STATUSES: readonly CastingStatus[] = ['draft', 'collecting', 'complete', 'locked'];
const CASTING_METHODS: readonly CastingMethod[] = ['tap', 'shake'];

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readNonEmptyString(value: unknown, code: 'INVALID_SESSION_ID', message: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new CastingDomainError(code, message);
  }
  return value;
}

function readTimestamp(value: unknown, fieldName: string): string {
  if (
    typeof value !== 'string' ||
    !/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
    Number.isNaN(Date.parse(value))
  ) {
    throw new CastingDomainError(
      'INVALID_TIMESTAMP',
      `${fieldName} must be an ISO 8601 timestamp with an explicit offset.`,
    );
  }
  return value;
}

function readMethod(value: unknown): CastingMethod {
  if (!CASTING_METHODS.some((method) => method === value)) {
    throw new CastingDomainError('INVALID_CASTING_METHOD', 'Unknown casting method.');
  }
  return value as CastingMethod;
}

function readStatus(value: unknown): CastingStatus {
  if (!CASTING_STATUSES.some((status) => status === value)) {
    throw new CastingDomainError('INVALID_CASTING_STATUS', 'Unknown casting status.');
  }
  return value as CastingStatus;
}

function freezeSession(session: CastingSession): CastingSession {
  return Object.freeze({
    ...session,
    lines: Object.freeze([...session.lines]),
    redoLines: Object.freeze([...session.redoLines]),
  });
}

function assertChronology(createdAt: string, updatedAt: string, lockedAt: string | null): void {
  const created = Date.parse(createdAt);
  const updated = Date.parse(updatedAt);
  const locked = lockedAt === null ? null : Date.parse(lockedAt);
  if (updated < created || (locked !== null && (locked < created || updated < locked))) {
    throw new CastingDomainError(
      'INVALID_SESSION_STATE',
      'Session timestamps cannot precede creation.',
    );
  }
}

function assertStateShape(
  status: CastingStatus,
  lines: readonly CastLine[],
  redoLines: readonly CastLine[],
  lockedAt: string | null,
): void {
  if (lines.length + redoLines.length > 6) {
    throw new CastingDomainError(
      'INVALID_SESSION_STATE',
      'A session cannot contain over six lines.',
    );
  }

  if (status === 'draft' && lines.length !== 0) {
    throw new CastingDomainError(
      'INVALID_SESSION_STATE',
      'A draft session cannot have cast lines.',
    );
  }
  if (status === 'collecting' && (lines.length < 1 || lines.length > 5)) {
    throw new CastingDomainError(
      'INVALID_SESSION_STATE',
      'A collecting session must have from one to five lines.',
    );
  }
  if ((status === 'complete' || status === 'locked') && lines.length !== 6) {
    throw new CastingDomainError(
      'INVALID_SESSION_STATE',
      'A complete or locked session must have exactly six lines.',
    );
  }
  if ((status === 'complete' || status === 'locked') && redoLines.length !== 0) {
    throw new CastingDomainError(
      'INVALID_SESSION_STATE',
      'A complete or locked session cannot contain undone lines.',
    );
  }
  if ((status === 'locked') !== (lockedAt !== null)) {
    throw new CastingDomainError(
      'INVALID_SESSION_STATE',
      'lockedAt must exist if and only if the session is locked.',
    );
  }
}

export function createCastingSession(input: CreateCastingSessionInput): CastingSession {
  const sessionId = readNonEmptyString(
    input.sessionId,
    'INVALID_SESSION_ID',
    'sessionId must be a non-empty string.',
  );
  const createdAt = readTimestamp(input.createdAt, 'createdAt');

  return freezeSession({
    sessionId,
    status: 'draft',
    method: readMethod(input.method),
    lines: [],
    redoLines: [],
    inputSchemaVersion: assertImmutableVersion(input.inputSchemaVersion, 'inputSchemaVersion'),
    rulesetVersion: assertImmutableVersion(input.rulesetVersion, 'rulesetVersion'),
    randomAlgorithmVersion: assertImmutableVersion(
      input.randomAlgorithmVersion,
      'randomAlgorithmVersion',
    ),
    createdAt,
    updatedAt: createdAt,
    lockedAt: null,
  });
}

export function restoreCastingSession(value: unknown): CastingSession {
  if (!isRecord(value)) {
    throw new CastingDomainError('INVALID_SESSION_STATE', 'Saved session must be an object.');
  }

  const sessionId = readNonEmptyString(
    value.sessionId,
    'INVALID_SESSION_ID',
    'sessionId must be a non-empty string.',
  );
  const status = readStatus(value.status);
  const method = readMethod(value.method);
  const inputSchemaVersion = assertImmutableVersion(value.inputSchemaVersion, 'inputSchemaVersion');
  const rulesetVersion = assertImmutableVersion(value.rulesetVersion, 'rulesetVersion');
  const randomAlgorithmVersion = assertImmutableVersion(
    value.randomAlgorithmVersion,
    'randomAlgorithmVersion',
  );
  const createdAt = readTimestamp(value.createdAt, 'createdAt');
  const updatedAt = readTimestamp(value.updatedAt, 'updatedAt');

  let lockedAt: string | null;
  if (value.lockedAt === null) {
    lockedAt = null;
  } else {
    lockedAt = readTimestamp(value.lockedAt, 'lockedAt');
  }

  if (!Array.isArray(value.lines) || !Array.isArray(value.redoLines)) {
    throw new CastingDomainError(
      'INVALID_SESSION_STATE',
      'Saved session lines and redoLines must be arrays.',
    );
  }

  const lines = value.lines.map((line, index) => {
    const position = index + 1;
    if (!isLinePosition(position)) {
      throw new CastingDomainError('INVALID_LINE_POSITION', 'A session cannot exceed six lines.');
    }
    return restoreCastLine(line, position, rulesetVersion);
  });
  const redoLines = value.redoLines.map((line, index) => {
    const position = lines.length + index + 1;
    if (!isLinePosition(position)) {
      throw new CastingDomainError(
        'INVALID_LINE_POSITION',
        'Undo history cannot exceed six lines.',
      );
    }
    return restoreCastLine(line, position, rulesetVersion);
  });

  assertChronology(createdAt, updatedAt, lockedAt);
  assertStateShape(status, lines, redoLines, lockedAt);

  return freezeSession({
    sessionId,
    status,
    method,
    lines,
    redoLines,
    inputSchemaVersion,
    rulesetVersion,
    randomAlgorithmVersion,
    createdAt,
    updatedAt,
    lockedAt,
  });
}

function readUpdatedAt(session: CastingSession, updatedAtValue: unknown): string {
  const updatedAt = readTimestamp(updatedAtValue, 'updatedAt');
  if (Date.parse(updatedAt) < Date.parse(session.updatedAt)) {
    throw new CastingDomainError(
      'INVALID_SESSION_STATE',
      'A state transition cannot move updatedAt backward.',
    );
  }
  return updatedAt;
}

export function assertCanCastNext(value: unknown): CastingSession {
  const session = restoreCastingSession(value);
  if (session.status === 'locked') {
    throw new CastingDomainError('SESSION_LOCKED', 'A locked session cannot be changed.');
  }
  if (session.status === 'complete') {
    throw new CastingDomainError(
      'SESSION_COMPLETE',
      'A complete session cannot cast a seventh line.',
    );
  }
  return session;
}

export function castNextLine(
  value: unknown,
  coins: CoinTuple,
  updatedAtValue: unknown,
): CastingSession {
  const session = assertCanCastNext(value);
  const updatedAt = readUpdatedAt(session, updatedAtValue);
  const nextPosition = session.lines.length + 1;
  if (!isLinePosition(nextPosition)) {
    throw new CastingDomainError('SESSION_COMPLETE', 'A session cannot cast a seventh line.');
  }

  const line = createCastLine({
    position: nextPosition,
    coins,
    sequence: nextPosition,
    rulesetVersion: session.rulesetVersion,
  });
  const lines = [...session.lines, line];

  return freezeSession({
    ...session,
    status: lines.length === 6 ? 'complete' : 'collecting',
    lines,
    redoLines: [],
    updatedAt,
  });
}

function assertEditableSession(value: unknown): CastingSession {
  const session = restoreCastingSession(value);
  if (session.status === 'locked') {
    throw new CastingDomainError('SESSION_LOCKED', 'A locked session cannot be changed.');
  }
  if (session.status === 'complete') {
    throw new CastingDomainError(
      'SESSION_COMPLETE',
      'A complete session is read-only; start or copy a new session instead.',
    );
  }
  return session;
}

export function undoLastLine(value: unknown, updatedAtValue: unknown): CastingSession {
  const session = assertEditableSession(value);
  const updatedAt = readUpdatedAt(session, updatedAtValue);
  const removed = session.lines.at(-1);
  if (removed === undefined) {
    throw new CastingDomainError('NO_LINE_TO_UNDO', 'The session has no line to undo.');
  }

  const lines = session.lines.slice(0, -1);
  return freezeSession({
    ...session,
    status: lines.length === 0 ? 'draft' : 'collecting',
    lines,
    redoLines: [removed, ...session.redoLines],
    updatedAt,
  });
}

export function restoreLastUndoneLine(value: unknown, updatedAtValue: unknown): CastingSession {
  const session = assertEditableSession(value);
  const updatedAt = readUpdatedAt(session, updatedAtValue);
  const [restored, ...remainingRedoLines] = session.redoLines;
  if (restored === undefined) {
    throw new CastingDomainError(
      'NO_LINE_TO_RESTORE',
      'The session has no undone line to restore.',
    );
  }

  const nextPosition = session.lines.length + 1;
  if (!isLinePosition(nextPosition) || restored.position !== nextPosition) {
    throw new CastingDomainError('INVALID_SESSION_STATE', 'Undo history is not continuous.');
  }

  const lines = [...session.lines, restored];
  return freezeSession({
    ...session,
    status: lines.length === 6 ? 'complete' : 'collecting',
    lines,
    redoLines: remainingRedoLines,
    updatedAt,
  });
}

export function resetCastingSession(value: unknown, updatedAtValue: unknown): CastingSession {
  const session = assertEditableSession(value);
  const updatedAt = readUpdatedAt(session, updatedAtValue);

  return freezeSession({
    ...session,
    status: 'draft',
    lines: [],
    redoLines: [],
    updatedAt,
  });
}

export function lockCastingSession(value: unknown, lockedAtValue: unknown): CastingSession {
  const session = restoreCastingSession(value);
  if (session.status === 'locked') {
    throw new CastingDomainError('SESSION_LOCKED', 'The session is already locked.');
  }
  if (session.status !== 'complete') {
    throw new CastingDomainError(
      'SESSION_NOT_COMPLETE',
      'Only a six-line complete session can be locked.',
    );
  }

  const lockedAt = readUpdatedAt(session, lockedAtValue);
  return freezeSession({
    ...session,
    status: 'locked',
    updatedAt: lockedAt,
    lockedAt,
  });
}

export function getCastingProgress(value: unknown): CastingProgress {
  const session = restoreCastingSession(value);
  const nextPositionValue = session.lines.length + 1;
  const nextPosition: LinePosition | null = isLinePosition(nextPositionValue)
    ? nextPositionValue
    : null;

  return Object.freeze({
    castCount: session.lines.length,
    remainingCount: 6 - session.lines.length,
    nextPosition,
    isComplete: session.status === 'complete' || session.status === 'locked',
    isLocked: session.status === 'locked',
  });
}
