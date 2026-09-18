import {
  CastingDomainError,
  isCoinValue,
  type CoinValue,
  type RandomSource,
} from '@/domain/casting';

export class FixedRandomSource implements RandomSource {
  public readonly algorithmVersion = 'test-fixed-coin-v1';

  private readonly value: CoinValue;

  public constructor(value: CoinValue) {
    if (!isCoinValue(value)) {
      throw new CastingDomainError('INVALID_COIN_VALUE', 'Fixed coin must be either 2 or 3.');
    }
    this.value = value;
  }

  public async nextCoin(): Promise<CoinValue> {
    return this.value;
  }
}
