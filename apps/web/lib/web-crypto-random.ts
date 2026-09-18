import type { CoinValue, RandomSource } from '@liuyao/domain';

function nextCoinFromByte(value: number): CoinValue {
  return (value & 1) === 0 ? 2 : 3;
}

/** Browser-only secure random source for the three-coin casting method. */
export function createWebCryptoRandomSource(): RandomSource {
  return {
    algorithmVersion: 'web-crypto-v1',
    nextCoin: async () => {
      const cryptoApi = globalThis.crypto;
      if (cryptoApi === undefined) throw new Error('Web Crypto is unavailable.');
      const bytes = new Uint8Array(1);
      cryptoApi.getRandomValues(bytes);
      return nextCoinFromByte(bytes[0] ?? 0);
    },
  };
}
