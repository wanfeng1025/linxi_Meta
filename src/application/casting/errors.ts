export type CastingApplicationErrorCode =
  | 'ACTIVE_SESSION_EXISTS'
  | 'SESSION_NOT_FOUND'
  | 'SESSION_ID_MISMATCH'
  | 'STALE_SESSION'
  | 'SESSION_BUSY'
  | 'NOT_A_DRAFT';

export class CastingApplicationError extends Error {
  public override readonly name = 'CastingApplicationError';

  public constructor(
    public readonly code: CastingApplicationErrorCode,
    message: string,
  ) {
    super(message);
  }
}
