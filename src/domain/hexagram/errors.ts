export type HexagramDomainErrorCode =
  | 'INVALID_BIT'
  | 'INVALID_TRIGRAM_BITS'
  | 'INVALID_HEXAGRAM_BITS'
  | 'INVALID_TRIGRAM_CODE'
  | 'INVALID_HEXAGRAM_CODE'
  | 'INVALID_LINE_COUNT'
  | 'INVALID_LINE_POSITION'
  | 'INVALID_LINE_ORDER'
  | 'INVALID_LINE_VALUE'
  | 'INVALID_STRUCTURE'
  | 'INVALID_VERSION'
  | 'INVALID_CATALOG'
  | 'DUPLICATE_TRIGRAM'
  | 'DUPLICATE_HEXAGRAM'
  | 'INCOMPLETE_CATALOG'
  | 'TRIGRAM_NOT_FOUND'
  | 'HEXAGRAM_NOT_FOUND';

export class HexagramDomainError extends Error {
  public override readonly name = 'HexagramDomainError';

  public constructor(
    public readonly code: HexagramDomainErrorCode,
    message: string,
  ) {
    super(message);
  }
}
