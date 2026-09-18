import { CryptoDigestAlgorithm, digestStringAsync } from 'expo-crypto';

import type { HashProvider } from './types';

export class ExpoSha256Provider implements HashProvider {
  public async sha256(value: string): Promise<string> {
    return digestStringAsync(CryptoDigestAlgorithm.SHA256, value);
  }
}
