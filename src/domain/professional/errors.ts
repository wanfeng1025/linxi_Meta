export type ProfessionalDomainErrorCode =
  | 'INVALID_RULESET'
  | 'UNVERIFIED_RULESET'
  | 'MIXED_RULESET'
  | 'RULE_NOT_FOUND'
  | 'INVALID_INPUT'
  | 'CALENDAR_VERSION_MISMATCH'
  | 'AMBIGUOUS_USEFUL_GOD';

export class ProfessionalDomainError extends Error {
  readonly code: ProfessionalDomainErrorCode;

  constructor(code: ProfessionalDomainErrorCode, message: string) {
    super(message);
    this.name = 'ProfessionalDomainError';
    this.code = code;
  }
}
