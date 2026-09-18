import { CastingDomainError } from './errors';
import { createCoinTuple, isCoinValue } from './line';
import type { CoinTuple, CoinValue } from './types';

export interface RandomSource {
  readonly algorithmVersion: string;
  nextCoin(): Promise<CoinValue>;
}

export async function drawThreeCoins(randomSource: RandomSource): Promise<CoinTuple> {
  const coins: CoinValue[] = [];

  for (let index = 0; index < 3; index += 1) {
    const coin = await randomSource.nextCoin();
    if (!isCoinValue(coin)) {
      throw new CastingDomainError(
        'RANDOM_SOURCE_INVALID_VALUE',
        'RandomSource must return only 2 or 3.',
      );
    }
    coins.push(coin);
  }

  return createCoinTuple(coins);
}
