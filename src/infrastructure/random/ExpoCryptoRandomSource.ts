import { CastingDomainError, type CoinValue, type RandomSource } from '@/domain/casting';

export const EXPO_CRYPTO_RANDOM_ALGORITHM_VERSION = 'expo-crypto-random-byte-lsb-v1';

export type RandomBytesProvider = (byteCount: number) => Promise<Uint8Array>;

async function expoRandomBytes(byteCount: number): Promise<Uint8Array> {
  const { getRandomBytesAsync } = await import('expo-crypto');
  return getRandomBytesAsync(byteCount);
}

export class ExpoCryptoRandomSource implements RandomSource {
  public readonly algorithmVersion = EXPO_CRYPTO_RANDOM_ALGORITHM_VERSION;

  public constructor(private readonly randomBytes: RandomBytesProvider = expoRandomBytes) {}

  public async nextCoin(): Promise<CoinValue> {
    let bytes: Uint8Array;
    try {
      bytes = await this.randomBytes(1);
    } catch {
      throw new CastingDomainError(
        'SECURE_RANDOM_UNAVAILABLE',
        'The platform secure random source is unavailable.',
      );
    }

    const byte = bytes[0];
    if (bytes.length !== 1 || byte === undefined) {
      throw new CastingDomainError(
        'SECURE_RANDOM_UNAVAILABLE',
        'The platform secure random source returned an invalid byte array.',
      );
    }

    return (byte & 1) === 0 ? 2 : 3;
  }
}
