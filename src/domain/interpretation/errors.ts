export type InterpretationErrorCode =
  'INVALID_SCHEMA' | 'VERSION_MISMATCH' | 'INVALID_RULESET' | 'INVALID_TEMPLATE';

export class InterpretationDomainError extends Error {
  public readonly code: InterpretationErrorCode;

  public constructor(code: InterpretationErrorCode, message: string) {
    super(message);
    this.name = 'InterpretationDomainError';
    this.code = code;
  }
}
