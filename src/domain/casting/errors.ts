export type CastingDomainErrorCode =
  | 'INVALID_COIN_COUNT'
  | 'INVALID_COIN_VALUE'
  | 'INVALID_LINE_VALUE'
  | 'INVALID_LINE_POSITION'
  | 'INVALID_LINE_SEQUENCE'
  | 'INVALID_LINE_FACTS'
  | 'INVALID_SESSION_ID'
  | 'INVALID_CASTING_METHOD'
  | 'INVALID_CASTING_STATUS'
  | 'INVALID_SESSION_STATE'
  | 'INVALID_TIMESTAMP'
  | 'INVALID_VERSION'
  | 'NO_LINE_TO_UNDO'
  | 'NO_LINE_TO_RESTORE'
  | 'SESSION_COMPLETE'
  | 'SESSION_LOCKED'
  | 'SESSION_NOT_COMPLETE'
  | 'RANDOM_SOURCE_INVALID_VALUE'
  | 'RANDOM_SOURCE_EXHAUSTED'
  | 'SECURE_RANDOM_UNAVAILABLE';

export class CastingDomainError extends Error {
  public override readonly name = 'CastingDomainError';

  public constructor(
    public readonly code: CastingDomainErrorCode,
    message: string,
  ) {
    super(message);
  }
}
