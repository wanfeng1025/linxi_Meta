import {
  CastingDomainError,
  isCoinValue,
  type CoinValue,
  type RandomSource,
} from '@/domain/casting';

export class SequenceRandomSource implements RandomSource {
  public readonly algorithmVersion = 'test-sequence-coin-v1';

  private readonly values: readonly CoinValue[];
  private cursor = 0;

  public constructor(values: readonly CoinValue[]) {
    if (!values.every(isCoinValue)) {
      throw new CastingDomainError(
        'INVALID_COIN_VALUE',
        'Random sequence may contain only 2 and 3.',
      );
    }
    this.values = Object.freeze([...values]);
  }

  public get consumedCount(): number {
    return this.cursor;
  }

  public async nextCoin(): Promise<CoinValue> {
    const value = this.values[this.cursor];
    if (value === undefined) {
      throw new CastingDomainError(
        'RANDOM_SOURCE_EXHAUSTED',
        'The deterministic random sequence is exhausted.',
      );
    }
    this.cursor += 1;
    return value;
  }
}
