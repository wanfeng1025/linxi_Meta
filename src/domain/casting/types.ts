export type CoinValue = 2 | 3;

export type CoinTuple = readonly [CoinValue, CoinValue, CoinValue];

export type LineValue = 6 | 7 | 8 | 9;

export type Polarity = 'yin' | 'yang';

export type LineMovement = 'static' | 'moving';

export type LinePosition = 1 | 2 | 3 | 4 | 5 | 6;

export type CastingStatus = 'draft' | 'collecting' | 'complete' | 'locked';

export type CastingMethod = 'tap' | 'shake';

export interface CastLine {
  readonly position: LinePosition;
  readonly coins: CoinTuple;
  readonly value: LineValue;
  readonly polarity: Polarity;
  readonly movement: LineMovement;
  readonly changedPolarity: Polarity;
  readonly sequence: LinePosition;
}

export interface CastingSession {
  readonly sessionId: string;
  readonly status: CastingStatus;
  readonly method: CastingMethod;
  readonly lines: readonly CastLine[];
  readonly redoLines: readonly CastLine[];
  readonly inputSchemaVersion: string;
  readonly rulesetVersion: string;
  readonly randomAlgorithmVersion: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lockedAt: string | null;
}

export interface CreateCastingSessionInput {
  readonly sessionId: string;
  readonly method: CastingMethod;
  readonly inputSchemaVersion: string;
  readonly rulesetVersion: string;
  readonly randomAlgorithmVersion: string;
  readonly createdAt: string;
}

export interface CastingProgress {
  readonly castCount: number;
  readonly remainingCount: number;
  readonly nextPosition: LinePosition | null;
  readonly isComplete: boolean;
  readonly isLocked: boolean;
}
